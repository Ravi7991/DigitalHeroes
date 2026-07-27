import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { prisma } from '../lib/db.js';
import { signToken, hashPassword } from '../lib/auth.js';
import { Role, LeadStatus } from '@prisma/client';

describe('Express REST API CRM Endpoints Tests', () => {
  let testAdmin: any;
  let testMember: any;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    // Make sure database is clean
    await prisma.activityLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    const pw = await hashPassword('password123');

    testAdmin = await prisma.user.create({
      data: {
        email: 'test_admin@express.com',
        name: 'Admin User',
        passwordHash: pw,
        role: Role.ADMIN,
      },
    });

    testMember = await prisma.user.create({
      data: {
        email: 'test_member@express.com',
        name: 'Member User',
        passwordHash: pw,
        role: Role.MEMBER,
      },
    });

    adminToken = signToken({ userId: testAdmin.id, email: testAdmin.email, role: testAdmin.role });
    memberToken = signToken({ userId: testMember.id, email: testMember.email, role: testMember.role });
  });

  afterAll(async () => {
    // Cleanup database
    await prisma.activityLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /health', () => {
    it('should return 200 OK health check status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Auth Endpoints & Access Control', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test_admin@express.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('should fail login with invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test_admin@express.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for GET /leads if unauthenticated', async () => {
      const res = await request(app).get('/leads');
      expect(res.status).toBe(401);
    });

    it('should allow GET /leads if authenticated', async () => {
      const res = await request(app)
        .get('/leads')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Core Flow 1: Public Lead Capture', () => {
    it('should capture a lead from public form without auth and log a CREATED activity', async () => {
      const payload = {
        name: 'Peter Parker',
        email: 'peter@dailybugle.com',
        phone: '+1-555-1234',
        company: 'Daily Bugle',
        value: 2000,
      };

      const res = await request(app)
        .post('/leads')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(LeadStatus.NEW);

      // Verify log was created
      const logs = await prisma.activityLog.findMany({
        where: { leadId: res.body.id },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('CREATED');
      expect(logs[0].userId).toBeNull();
    });
  });

  describe('Core Flow 2: Lead Lifecycle & Auth Rules', () => {
    let lead: any;

    beforeEach(async () => {
      lead = await prisma.lead.create({
        data: {
          name: 'Clark Kent',
          email: 'clark@dailyplanet.com',
          company: 'Daily Planet',
          value: 4500,
          status: LeadStatus.NEW,
        },
      });
    });

    it('should block a Member from writing notes on an unassigned lead', async () => {
      const res = await request(app)
        .post(`/leads/${lead.id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'Member trying to note' });

      expect(res.status).toBe(403);
    });

    it('should block a Member from changing status of an unassigned lead', async () => {
      const res = await request(app)
        .patch(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: LeadStatus.CONTACTED });

      expect(res.status).toBe(403);
    });

    it('should allow Admin to assign lead to Member', async () => {
      const res = await request(app)
        .patch(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedToId: testMember.id });

      expect(res.status).toBe(200);
      expect(res.body.assignedToId).toBe(testMember.id);

      // Verify activity trail assignment entry exists
      const logs = await prisma.activityLog.findMany({
        where: { leadId: lead.id, action: 'ASSIGNED' },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].details).toContain(testMember.name);
    });

    it('should allow Member to update status and add notes after assignment', async () => {
      // 1. Assign to member
      await prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId: testMember.id },
      });

      // 2. Member updates status to QUALIFIED
      const resStatus = await request(app)
        .patch(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ status: LeadStatus.QUALIFIED });

      expect(resStatus.status).toBe(200);

      // 3. Member adds a note
      const resNote = await request(app)
        .post(`/leads/${lead.id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ content: 'Confirmed Clark Kent budget and decision authority.' });

      expect(resNote.status).toBe(201);

      // 4. Verify detail output
      const resDetail = await request(app)
        .get(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(resDetail.body.notes.length).toBe(1);
      expect(resDetail.body.notes[0].content).toContain('Confirmed Clark Kent');
      expect(resDetail.body.activities.some((a: any) => a.action === 'STATUS_UPDATED')).toBe(true);
    });

    it('should restrict lead deletion to Admin only', async () => {
      // Member tries to delete
      const resMember = await request(app)
        .delete(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${memberToken}`);
      expect(resMember.status).toBe(403);

      // Admin deletes
      const resAdmin = await request(app)
        .delete(`/leads/${lead.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resAdmin.status).toBe(204);

      // Verify deletion
      const checkLead = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(checkLead).toBeNull();
    });
  });

  afterAll(async () => {
    // Re-seed default users after tests complete
    await prisma.activityLog.deleteMany();
    await prisma.note.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.user.deleteMany();

    const adminHash = await hashPassword('admin123');
    const memberHash = await hashPassword('member123');

    await prisma.user.create({
      data: {
        email: 'admin@leadplatform.com',
        name: 'Ravikant Prajapati',
        passwordHash: adminHash,
        role: Role.ADMIN,
      },
    });

    await prisma.user.create({
      data: {
        email: 'member@leadplatform.com',
        name: 'Surya Prajapati',
        passwordHash: memberHash,
        role: Role.MEMBER,
      },
    });
  });
});

