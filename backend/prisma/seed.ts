import { PrismaClient, Role, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up database
  await prisma.activityLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const memberPasswordHash = await bcrypt.hash('member123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@leadplatform.com',
      name: 'Sarah Jenkins (Admin)',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@leadplatform.com',
      name: 'John Doe (Member)',
      passwordHash: memberPasswordHash,
      role: Role.MEMBER,
    },
  });

  console.log('Created Users:', { admin: admin.email, member: member.email });

  // Create Leads
  const lead1 = await prisma.lead.create({
    data: {
      name: 'Alice Vance',
      email: 'alice@acme.com',
      phone: '+1-555-0199',
      company: 'Acme Corporation',
      value: 5000,
      status: LeadStatus.NEW,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead1.id,
      userId: admin.id,
      action: 'CREATED',
      details: 'Lead captured from public form',
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@globex.com',
      phone: '+1-555-0142',
      company: 'Globex Industries',
      value: 12000,
      status: LeadStatus.CONTACTED,
      assignedToId: member.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead2.id,
      userId: admin.id,
      action: 'CREATED',
      details: 'Lead captured from public form',
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead2.id,
      userId: admin.id,
      action: 'ASSIGNED',
      details: `Assigned to ${member.name}`,
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      name: 'Charlie Brown',
      email: 'charlie@hooli.xyz',
      phone: '+1-555-0188',
      company: 'Hooli Inc.',
      value: 25000,
      status: LeadStatus.QUALIFIED,
      assignedToId: member.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead3.id,
      userId: admin.id,
      action: 'CREATED',
      details: 'Lead created in CRM',
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead3.id,
      userId: admin.id,
      action: 'ASSIGNED',
      details: `Assigned to ${member.name}`,
    },
  });

  await prisma.note.create({
    data: {
      leadId: lead3.id,
      userId: member.id,
      content: 'Met Charlie at the Tech Conference. Very interested in our enterprise suite. Wants a demo next week.',
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead3.id,
      userId: member.id,
      action: 'NOTE_ADDED',
      details: 'Added a note regarding tech conference meeting',
    },
  });

  const lead4 = await prisma.lead.create({
    data: {
      name: 'Diana Prince',
      email: 'diana@wayne.co',
      phone: '+1-555-0100',
      company: 'Wayne Enterprises',
      value: 95000,
      status: LeadStatus.PROPOSAL,
      assignedToId: admin.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead4.id,
      userId: admin.id,
      action: 'CREATED',
      details: 'Lead created in CRM',
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead4.id,
      userId: admin.id,
      action: 'ASSIGNED',
      details: `Assigned to ${admin.name}`,
    },
  });

  await prisma.note.create({
    data: {
      leadId: lead4.id,
      userId: admin.id,
      content: 'Sent custom pricing proposal. Waiting on legal team approval.',
    },
  });

  const lead5 = await prisma.lead.create({
    data: {
      name: 'Ethan Hunt',
      email: 'ethan@imf.org',
      phone: '+1-555-0155',
      company: 'Impossible Mission Force',
      value: 150000,
      status: LeadStatus.WON,
      assignedToId: admin.id,
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead5.id,
      userId: admin.id,
      action: 'CREATED',
      details: 'Lead created in CRM',
    },
  });

  await prisma.activityLog.create({
    data: {
      leadId: lead5.id,
      userId: admin.id,
      action: 'STATUS_UPDATED',
      details: 'Status changed from NEW to WON',
    },
  });

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
