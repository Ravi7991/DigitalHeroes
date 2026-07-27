import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { prisma } from './lib/db.js';
import { hashPassword, comparePassword, signToken } from './lib/auth.js';
import { authenticate, authorize } from './middleware/auth.js';
import { Role, LeadStatus } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup: allow requests from frontend (port 3000)
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

app.use(express.json());
app.use(cookieParser());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /auth/logout
app.post('/auth/logout', (req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

// GET /auth/me
app.get('/auth/me', authenticate, (req, res) => {
  return res.json({ user: req.user });
});

// GET /users - List users for selectors
app.get('/users', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /leads - Public Capture (No authentication required)
app.post('/leads', async (req, res) => {
  try {
    const { name, email, phone, company, value } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        company: company || null,
        value: value ? parseFloat(value) : 0,
        status: LeadStatus.NEW,
      },
    });

    // Create system log
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        action: 'CREATED',
        details: 'Lead captured via public form',
      },
    });

    return res.status(201).json(lead);
  } catch (error) {
    console.error('Public lead capture error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /leads - Authenticated Leads List (with search, filter, pagination)
app.get('/leads', authenticate, async (req, res) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '10', 10);
    const status = req.query.status as string;
    const assignedToId = req.query.assignedToId as string;
    const q = req.query.q as string;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status as LeadStatus;
    }

    if (assignedToId) {
      if (assignedToId === 'unassigned') {
        where.assignedToId = null;
      } else {
        where.assignedToId = assignedToId;
      }
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      data: leads,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
    });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /leads/:id - Detail view
app.get('/leads/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        notes: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.json(lead);
  } catch (error) {
    console.error('Fetch lead details error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /leads/:id - Update lead
app.patch('/leads/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { name, email, phone, company, value, status, assignedToId } = req.body;
    const user = req.user!;

    const existingLead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const isOwner = existingLead.assignedToId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    // Permissions check
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Forbidden: You can only update leads assigned to you' });
    }

    if (!isAdmin && assignedToId !== undefined && assignedToId !== existingLead.assignedToId) {
      return res.status(403).json({ error: 'Forbidden: Only admins can reassign leads' });
    }

    const updateData: any = {};
    const activitiesToCreate: any[] = [];

    // Status change
    if (status !== undefined && status !== existingLead.status) {
      if (!Object.values(LeadStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid lead status' });
      }
      updateData.status = status as LeadStatus;
      activitiesToCreate.push({
        leadId: id,
        userId: user.id,
        action: 'STATUS_UPDATED',
        details: `Status changed from ${existingLead.status} to ${status}`,
      });
    }

    // Assignment change
    if (assignedToId !== undefined && assignedToId !== existingLead.assignedToId) {
      updateData.assignedToId = assignedToId || null;

      let assigneeName = 'Unassigned';
      if (assignedToId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedToId },
        });
        if (!assignee) {
          return res.status(400).json({ error: 'Assignee user not found' });
        }
        assigneeName = assignee.name;
      }

      activitiesToCreate.push({
        leadId: id,
        userId: user.id,
        action: 'ASSIGNED',
        details: assignedToId ? `Assigned to ${assigneeName}` : 'Lead was unassigned',
      });
    }

    // Other details
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (value !== undefined) updateData.value = value ? parseFloat(value) : 0;

    if (
      (name !== undefined && name !== existingLead.name) ||
      (email !== undefined && email !== existingLead.email) ||
      (phone !== undefined && phone !== existingLead.phone) ||
      (company !== undefined && company !== existingLead.company) ||
      (value !== undefined && value !== existingLead.value)
    ) {
      activitiesToCreate.push({
        leadId: id,
        userId: user.id,
        action: 'UPDATED',
        details: 'Contact details updated',
      });
    }

    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      ...activitiesToCreate.map((act) => prisma.activityLog.create({ data: act })),
    ]);

    return res.json(updatedLead);
  } catch (error) {
    console.error('Update lead error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /leads/:id - Delete lead (Admin only)
app.delete('/leads/:id', authenticate, authorize([Role.ADMIN]), async (req, res) => {
  try {
    const id = req.params.id as string;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Delete lead error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /leads/:id/notes - Add a note to a lead
app.post('/leads/:id/notes', authenticate, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;
    const user = req.user!;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const isOwner = lead.assignedToId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Forbidden: You can only add notes to leads assigned to you' });
    }

    const [note] = await prisma.$transaction([
      prisma.note.create({
        data: {
          leadId: id,
          userId: user.id,
          content: content.trim(),
        },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.activityLog.create({
        data: {
          leadId: id,
          userId: user.id,
          action: 'NOTE_ADDED',
          details: `Added a note: "${content.trim().substring(0, 60)}${content.trim().length > 60 ? '...' : ''}"`,
        },
      }),
    ]);

    return res.status(201).json(note);
  } catch (error) {
    console.error('Add note error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 CRM Backend Server running at http://localhost:${PORT}`);
  });
}
export default app;

