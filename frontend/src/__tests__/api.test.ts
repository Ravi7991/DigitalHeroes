import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { Role, LeadStatus } from '@prisma/client';

// Mock cookies storage
let mockCookieStore = new Map<string, string>();

vi.mock('next/headers', () => {
  return {
    cookies: vi.fn(async () => {
      return {
        get: (name: string) => {
          const val = mockCookieStore.get(name);
          return val ? { value: val } : undefined;
        },
        set: (name: string, value: string) => {
          mockCookieStore.set(name, value);
        },
        delete: (name: string) => {
          mockCookieStore.delete(name);
        },
      };
    }),
  };
});

// Import API handlers after mocking next/headers
import { POST as publicCaptureLead, GET as getLeadsList } from '@/app/api/leads/route';
import { PATCH as updateLead, DELETE as deleteLead, GET as getLeadDetail } from '@/app/api/leads/[id]/route';
import { POST as addNote } from '@/app/api/leads/[id]/notes/route';

describe('Lead Management Platform API Tests', () => {
  let testAdmin: any;
  let testMember: any;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    // Setup test users in database
    await prisma.activityLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    testAdmin = await prisma.user.create({
      data: {
        email: 'test_admin@platform.com',
        name: 'Test Admin',
        passwordHash: 'dummy_hash',
        role: Role.ADMIN,
      },
    });

    testMember = await prisma.user.create({
      data: {
        email: 'test_member@platform.com',
        name: 'Test Member',
        passwordHash: 'dummy_hash',
        role: Role.MEMBER,
      },
    });

    adminToken = signToken({ userId: testAdmin.id, email: testAdmin.email, role: testAdmin.role });
    memberToken = signToken({ userId: testMember.id, email: testMember.email, role: testMember.role });
  });

  beforeEach(() => {
    mockCookieStore.clear();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.activityLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('Auth & Route Access Control Rules', () => {
    it('should return 401 Unauthorized for GET /api/leads when not logged in', async () => {
      const req = new NextRequest('http://localhost:3000/api/leads');
      const res = await getLeadsList(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('should allow GET /api/leads when authenticated as member', async () => {
      mockCookieStore.set('auth_token', memberToken);
      const req = new NextRequest('http://localhost:3000/api/leads');
      const res = await getLeadsList(req);
      expect(res.status).toBe(200);
    });
  });

  describe('Core Flow 1: Public Lead Capture Form', () => {
    it('should successfully capture a lead publicly and create a system log entry', async () => {
      const payload = {
        name: 'Tony Stark',
        email: 'tony@stark.com',
        phone: '+1-234-5678',
        company: 'Stark Industries',
        value: 800000,
      };

      const req = new NextRequest('http://localhost:3000/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const res = await publicCaptureLead(req);
      expect(res.status).toBe(201);

      const lead = await res.json();
      expect(lead.id).toBeDefined();
      expect(lead.name).toBe('Tony Stark');
      expect(lead.status).toBe(LeadStatus.NEW);

      // Verify activity trail was created
      const activities = await prisma.activityLog.findMany({
        where: { leadId: lead.id },
      });
      expect(activities.length).toBe(1);
      expect(activities[0].action).toBe('CREATED');
      expect(activities[0].userId).toBeNull(); // Captured publicly
    });
  });

  describe('Core Flow 2: Lead Lifecycle, notes, and assignment rules', () => {
    let capturedLead: any;

    beforeEach(async () => {
      // Create a fresh lead for lifecycle testing
      capturedLead = await prisma.lead.create({
        data: {
          name: 'Steve Rogers',
          email: 'steve@shield.gov',
          company: 'Avengers',
          value: 15000,
          status: LeadStatus.NEW,
        },
      });
    });

    it('should block a Member from writing notes on an unassigned lead', async () => {
      mockCookieStore.set('auth_token', memberToken);
      const req = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Member tries to note' }),
      });

      const context = { params: Promise.resolve({ id: capturedLead.id }) };
      const res = await addNote(req, context);
      expect(res.status).toBe(403);
    });

    it('should block a Member from changing lead details on an unassigned lead', async () => {
      mockCookieStore.set('auth_token', memberToken);
      const req = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: LeadStatus.CONTACTED }),
      });

      const context = { params: Promise.resolve({ id: capturedLead.id }) };
      const res = await updateLead(req, context);
      expect(res.status).toBe(403);
    });

    it('should allow Admin to assign lead to Member and log the assignment', async () => {
      mockCookieStore.set('auth_token', adminToken);
      const req = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToId: testMember.id }),
      });

      const context = { params: Promise.resolve({ id: capturedLead.id }) };
      const res = await updateLead(req, context);
      expect(res.status).toBe(200);

      const updated = await res.json();
      expect(updated.assignedToId).toBe(testMember.id);

      // Verify assignment log exists
      const activities = await prisma.activityLog.findMany({
        where: { leadId: capturedLead.id, action: 'ASSIGNED' },
      });
      expect(activities.length).toBe(1);
      expect(activities[0].details).toContain(testMember.name);
    });

    it('should allow Member to update status and add notes after assignment', async () => {
      // 1. First assign lead to member via Admin
      await prisma.lead.update({
        where: { id: capturedLead.id },
        data: { assignedToId: testMember.id },
      });

      mockCookieStore.set('auth_token', memberToken);
      const context = { params: Promise.resolve({ id: capturedLead.id }) };

      // 2. Member updates status to CONTACTED
      const reqStatus = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: LeadStatus.CONTACTED }),
      });
      const resStatus = await updateLead(reqStatus, context);
      expect(resStatus.status).toBe(200);

      // 3. Member adds a note
      const reqNote = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Called Steve. He agreed to see details.' }),
      });
      const resNote = await addNote(reqNote, context);
      expect(resNote.status).toBe(201);

      // 4. Verify notes and activities lists
      const leadDetailsRes = await getLeadDetail(new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`), context);
      const leadDetails = await leadDetailsRes.json();
      expect(leadDetails.notes.length).toBe(1);
      expect(leadDetails.notes[0].content).toBe('Called Steve. He agreed to see details.');
      expect(leadDetails.activities.some((a: any) => a.action === 'STATUS_UPDATED')).toBe(true);
    });

    it('should restrict DELETE /api/leads/[id] to Admin users only', async () => {
      const context = { params: Promise.resolve({ id: capturedLead.id }) };

      // Member delete attempt - 403 Forbidden
      mockCookieStore.set('auth_token', memberToken);
      const reqMemberDel = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`, { method: 'DELETE' });
      const resMemberDel = await deleteLead(reqMemberDel, context);
      expect(resMemberDel.status).toBe(403);

      // Admin delete attempt - 204 No Content (Deleted)
      mockCookieStore.set('auth_token', adminToken);
      const reqAdminDel = new NextRequest(`http://localhost:3000/api/leads/${capturedLead.id}`, { method: 'DELETE' });
      const resAdminDel = await deleteLead(reqAdminDel, context);
      expect(resAdminDel.status).toBe(204);

      // Verify actually deleted
      const checkLead = await prisma.lead.findUnique({ where: { id: capturedLead.id } });
      expect(checkLead).toBeNull();
    });
  });
});
