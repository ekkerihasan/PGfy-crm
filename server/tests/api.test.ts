import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { escapeCell, toCsv } from '../src/lib/csv';
import { rate } from '../src/lib/metrics';
import { startOfTodayIST, startOfTomorrowIST, addDays, addHours } from '../src/lib/time';

const app = createApp();
let admin: string;
let sales: string;
let sales2: string;
let salesId: string;
let sales2Id: string;

async function login(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

const newLead = {
  customerName: 'Test Customer',
  mobile: '9876500001',
  email: 'test.customer@example.com',
  propertyCategory: 'PG',
  preferredLocation: 'Koramangala',
  budget: 12000,
  leadSource: 'WEBSITE',
};

beforeAll(async () => {
  admin = await login('admin@pgfy.demo', 'Admin@123');
  sales = await login('sales@pgfy.demo', 'Sales@123');
  sales2 = await login('sales2@pgfy.demo', 'Sales@123');
  salesId = (await prisma.user.findUniqueOrThrow({ where: { email: 'sales@pgfy.demo' } })).id;
  sales2Id = (await prisma.user.findUniqueOrThrow({ where: { email: 'sales2@pgfy.demo' } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Runs first, before any test mutates data, so numbers match the seed exactly.
describe('analytics on seed data', () => {
  it('executive dashboard matches hand-counted seed numbers', async () => {
    const res = await request(app).get('/api/dashboard').set(auth(sales));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('SALES_EXECUTIVE');
    expect(res.body.totals).toMatchObject({
      assignedLeads: 12, leadsContacted: 10, totalCalls: 25, connectedCalls: 19,
      convertedLeads: 2, pendingFollowUps: 7, overdueFollowUps: 3, todayFollowUps: 2,
    });
    // 10/12, 2/12, 19/25
    expect(res.body.metrics).toEqual({ callCoverageRate: 83.3, conversionRate: 16.7, connectionRate: 76 });
  });

  it('admin dashboard has overall totals and per-executive rows', async () => {
    const res = await request(app).get('/api/dashboard').set(auth(admin));
    expect(res.body.totals).toMatchObject({
      totalLeads: 24, assignedLeads: 20, unassignedLeads: 4, totalCalls: 42, connectedCalls: 31, convertedLeads: 3,
    });
    expect(res.body.metrics).toEqual({ callCoverageRate: 85, conversionRate: 15, connectionRate: 73.8 });
    expect(res.body.executives).toHaveLength(2);
  });

  it('rate() is zero-safe and rounds to 1 decimal', () => {
    expect(rate(0, 0)).toBe(0);
    expect(rate(5, 0)).toBe(0);
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(2, 2)).toBe(100);
  });

  it('an executive with no leads or calls gets 0% everywhere (no divide-by-zero)', async () => {
    await prisma.user.create({
      data: { name: 'Empty Exec', email: 'empty@pgfy.test', role: 'SALES_EXECUTIVE', passwordHash: await bcrypt.hash('Empty@123', 4) },
    });
    const token = await login('empty@pgfy.test', 'Empty@123');
    const res = await request(app).get('/api/dashboard').set(auth(token));
    expect(res.body.metrics).toEqual({ callCoverageRate: 0, conversionRate: 0, connectionRate: 0 });
    expect(res.body.totals.assignedLeads).toBe(0);
  });
});

describe('authentication', () => {
  it('returns token and safe user (no password hash) on correct login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ADMIN@pgfy.demo', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'admin@pgfy.demo', role: 'ADMIN' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('rejects wrong password and unknown email with the same 401', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'admin@pgfy.demo', password: 'wrong' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@pgfy.demo', password: 'Admin@123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toBe(b.body.error);
  });

  it('rejects missing and invalid tokens', async () => {
    expect((await request(app).get('/api/leads')).status).toBe(401);
    expect((await request(app).get('/api/leads').set(auth('not.a.jwt'))).status).toBe(401);
  });

  it('/me returns the current user', async () => {
    const res = await request(app).get('/api/auth/me').set(auth(sales));
    expect(res.body.user.email).toBe('sales@pgfy.demo');
  });
});

describe('role permissions (403 for executives)', () => {
  it('executive cannot create leads, assign, list executives or download reports', async () => {
    const anyLead = await prisma.lead.findFirstOrThrow({ where: { assignedToId: salesId } });
    expect((await request(app).post('/api/leads').set(auth(sales)).send(newLead)).status).toBe(403);
    expect((await request(app).patch(`/api/leads/${anyLead.id}/assign`).set(auth(sales)).send({ assignedToId: salesId })).status).toBe(403);
    expect((await request(app).get('/api/users/executives').set(auth(sales))).status).toBe(403);
    for (const r of ['leads', 'calls', 'performance']) {
      expect((await request(app).get(`/api/reports/${r}`).set(auth(sales))).status).toBe(403);
    }
  });

  it('admin cannot record calls or manage follow-ups (executive-only actions)', async () => {
    const lead = await prisma.lead.findFirstOrThrow({ where: { assignedToId: salesId } });
    const call = await request(app).post(`/api/leads/${lead.id}/calls`).set(auth(admin)).send({ outcome: 'CONNECTED', durationSeconds: 60 });
    expect(call.status).toBe(403);
    const fu = await request(app).post('/api/follow-ups').set(auth(admin)).send({ leadId: lead.id, dueAt: addDays(new Date(), 1) });
    expect(fu.status).toBe(403);
  });
});

describe('record ownership', () => {
  it('executive only lists their own leads', async () => {
    const res = await request(app).get('/api/leads').set(auth(sales));
    expect(res.body.leads).toHaveLength(12);
    expect(res.body.leads.every((l: { assignedToId: string }) => l.assignedToId === salesId)).toBe(true);
  });

  it("executive gets 404 on another executive's lead by guessing its id", async () => {
    const other = await prisma.lead.findFirstOrThrow({ where: { assignedToId: sales2Id } });
    expect((await request(app).get(`/api/leads/${other.id}`).set(auth(sales))).status).toBe(404);
    expect((await request(app).get(`/api/leads/${other.id}/calls`).set(auth(sales))).status).toBe(404);
    expect((await request(app).patch(`/api/leads/${other.id}`).set(auth(sales)).send({ status: 'LOST' })).status).toBe(404);
    expect((await request(app).post(`/api/leads/${other.id}/calls`).set(auth(sales)).send({ outcome: 'BUSY', durationSeconds: 0 })).status).toBe(404);
  });

  it('executive gets 404 on an unassigned lead', async () => {
    const unassigned = await prisma.lead.findFirstOrThrow({ where: { assignedToId: null } });
    expect((await request(app).get(`/api/leads/${unassigned.id}`).set(auth(sales))).status).toBe(404);
  });

  it("executive cannot complete another executive's follow-up", async () => {
    const fu = await prisma.followUp.findFirstOrThrow({ where: { status: 'PENDING', lead: { assignedToId: sales2Id } } });
    expect((await request(app).patch(`/api/follow-ups/${fu.id}`).set(auth(sales)).send({ action: 'complete' })).status).toBe(404);
  });

  it('executive may update only the status field of their own lead', async () => {
    const lead = await prisma.lead.findFirstOrThrow({ where: { assignedToId: salesId, status: 'INTERESTED' } });
    const bad = await request(app).patch(`/api/leads/${lead.id}`).set(auth(sales)).send({ budget: 1 });
    expect(bad.status).toBe(400);
    const sneaky = await request(app).patch(`/api/leads/${lead.id}`).set(auth(sales)).send({ status: 'VISIT_SCHEDULED', assignedToId: sales2Id });
    expect(sneaky.status).toBe(400);
    const ok = await request(app).patch(`/api/leads/${lead.id}`).set(auth(sales)).send({ status: 'VISIT_SCHEDULED' });
    expect(ok.status).toBe(200);
    expect(ok.body.lead.status).toBe('VISIT_SCHEDULED');
  });
});

describe('lead management and assignment', () => {
  let leadId: string;

  it('validates lead bodies and rejects unknown fields', async () => {
    expect((await request(app).post('/api/leads').set(auth(admin)).send({ ...newLead, mobile: '12345' })).status).toBe(400);
    expect((await request(app).post('/api/leads').set(auth(admin)).send({ ...newLead, id: 'hack' })).status).toBe(400);
    expect((await request(app).post('/api/leads').set(auth(admin)).send({ ...newLead, assignedToId: 'not-a-user' })).status).toBe(400);
  });

  it('admin creates a lead (status defaults to NEW)', async () => {
    const res = await request(app).post('/api/leads').set(auth(admin)).send(newLead);
    expect(res.status).toBe(201);
    expect(res.body.lead).toMatchObject({ status: 'NEW', assignedTo: null, budget: 12000 });
    leadId = res.body.lead.id;
  });

  it('admin cannot change assignment through the generic edit endpoint', async () => {
    const res = await request(app).patch(`/api/leads/${leadId}`).set(auth(admin)).send({ assignedToId: salesId });
    expect(res.status).toBe(400);
  });

  it("assign and reassign updates each executive's list", async () => {
    let res = await request(app).patch(`/api/leads/${leadId}/assign`).set(auth(admin)).send({ assignedToId: salesId });
    expect(res.body.lead.assignedTo.id).toBe(salesId);
    expect((await request(app).get(`/api/leads/${leadId}`).set(auth(sales))).status).toBe(200);

    res = await request(app).patch(`/api/leads/${leadId}/assign`).set(auth(admin)).send({ assignedToId: sales2Id });
    expect(res.body.lead.assignedTo.id).toBe(sales2Id);
    expect((await request(app).get(`/api/leads/${leadId}`).set(auth(sales))).status).toBe(404);
    const list2 = await request(app).get('/api/leads').set(auth(sales2));
    expect(list2.body.leads.some((l: { id: string }) => l.id === leadId)).toBe(true);
  });

  it('search and status filter work', async () => {
    const res = await request(app).get('/api/leads?search=koramangala&status=NEW').set(auth(admin));
    expect(res.body.leads.length).toBeGreaterThan(0);
    expect(res.body.leads.every((l: { status: string }) => l.status === 'NEW')).toBe(true);
    const un = await request(app).get('/api/leads?assignedToId=unassigned').set(auth(admin));
    expect(un.body.leads).toHaveLength(4);
  });
});

describe('call history (append-only)', () => {
  let leadId: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/leads').set(auth(admin)).send({ ...newLead, mobile: '9876500002', assignedToId: salesId });
    leadId = res.body.lead.id;
  });

  it('two calls on one lead are both kept, newest first, and NEW becomes CONTACTED', async () => {
    const first = await request(app).post(`/api/leads/${leadId}/calls`).set(auth(sales))
      .send({ outcome: 'NOT_ANSWERED', durationSeconds: 0, calledAt: addHours(new Date(), -2) });
    expect(first.status).toBe(201);
    expect(first.body.call.executive.id).toBe(salesId); // taken from JWT

    const tomorrow = addHours(startOfTomorrowIST(), 11);
    const second = await request(app).post(`/api/leads/${leadId}/calls`).set(auth(sales))
      .send({ outcome: 'INTERESTED', durationSeconds: 240, notes: 'Wants a double-sharing room', nextFollowUpAt: tomorrow });
    expect(second.status).toBe(201);
    expect(second.body.followUp).toMatchObject({ status: 'PENDING', leadId });

    const history = await request(app).get(`/api/leads/${leadId}/calls`).set(auth(admin));
    expect(history.body.calls.map((c: { outcome: string }) => c.outcome)).toEqual(['INTERESTED', 'NOT_ANSWERED']);
    const lead = await request(app).get(`/api/leads/${leadId}`).set(auth(sales));
    expect(lead.body.lead.status).toBe('CONTACTED');
  });

  it('a CONVERTED outcome converts the lead', async () => {
    await request(app).post(`/api/leads/${leadId}/calls`).set(auth(sales)).send({ outcome: 'CONVERTED', durationSeconds: 300 });
    const lead = await request(app).get(`/api/leads/${leadId}`).set(auth(sales));
    expect(lead.body.lead.status).toBe('CONVERTED');
    expect((await request(app).get(`/api/leads/${leadId}/calls`).set(auth(sales))).body.calls).toHaveLength(3);
  });

  it('rejects invalid call bodies', async () => {
    const bad = [
      { outcome: 'MAYBE', durationSeconds: 10 },
      { outcome: 'BUSY', durationSeconds: -1 },
      { outcome: 'BUSY', durationSeconds: 0, executiveId: sales2Id },
      { outcome: 'BUSY', durationSeconds: 0, calledAt: addDays(new Date(), 2) },
      { outcome: 'BUSY', durationSeconds: 0, nextFollowUpAt: addDays(new Date(), -3) },
    ];
    for (const body of bad) {
      expect((await request(app).post(`/api/leads/${leadId}/calls`).set(auth(sales)).send(body)).status).toBe(400);
    }
  });

  it('executive /api/calls shows only calls they made', async () => {
    const res = await request(app).get('/api/calls').set(auth(sales));
    expect(res.body.calls.every((c: { executive: { id: string } }) => c.executive.id === salesId)).toBe(true);
  });
});

describe('follow-ups', () => {
  const today = startOfTodayIST();
  const tomorrow = startOfTomorrowIST();

  it('today / upcoming / overdue are disjoint and only contain PENDING items in the right window', async () => {
    const get = async (scope: string) => (await request(app).get(`/api/follow-ups?scope=${scope}`).set(auth(sales))).body.followUps as { id: string; status: string; dueAt: string }[];
    const [t, u, o] = [await get('today'), await get('upcoming'), await get('overdue')];
    expect(t.length && u.length && o.length).toBeTruthy();
    for (const f of [...t, ...u, ...o]) expect(f.status).toBe('PENDING');
    for (const f of t) expect(new Date(f.dueAt) >= today && new Date(f.dueAt) < tomorrow).toBe(true);
    for (const f of u) expect(new Date(f.dueAt) >= tomorrow).toBe(true);
    for (const f of o) expect(new Date(f.dueAt) < today).toBe(true);
    const ids = [...t, ...u, ...o].map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('completing removes it from pending scopes; completing twice is rejected', async () => {
    const overdue = (await request(app).get('/api/follow-ups?scope=overdue').set(auth(sales))).body.followUps[0];
    const done = await request(app).patch(`/api/follow-ups/${overdue.id}`).set(auth(sales)).send({ action: 'complete', notes: 'Spoke to customer' });
    expect(done.body.followUp).toMatchObject({ status: 'COMPLETED' });
    expect(done.body.followUp.completedAt).toBeTruthy();

    const stillOverdue = (await request(app).get('/api/follow-ups?scope=overdue').set(auth(sales))).body.followUps;
    expect(stillOverdue.some((f: { id: string }) => f.id === overdue.id)).toBe(false);
    const completed = (await request(app).get('/api/follow-ups?scope=completed').set(auth(sales))).body.followUps;
    expect(completed.some((f: { id: string }) => f.id === overdue.id)).toBe(true);

    expect((await request(app).patch(`/api/follow-ups/${overdue.id}`).set(auth(sales)).send({ action: 'complete' })).status).toBe(400);
  });

  it('rescheduling keeps the old record (RESCHEDULED) and creates a new PENDING one', async () => {
    const overdue = (await request(app).get('/api/follow-ups?scope=overdue').set(auth(sales))).body.followUps[0];
    const newDue = addHours(addDays(tomorrow, 2), 10);
    const res = await request(app).patch(`/api/follow-ups/${overdue.id}`).set(auth(sales)).send({ action: 'reschedule', dueAt: newDue });
    expect(res.status).toBe(200);
    expect(res.body.followUp.id).not.toBe(overdue.id);
    expect(res.body.followUp.status).toBe('PENDING');
    const old = await prisma.followUp.findUniqueOrThrow({ where: { id: overdue.id } });
    expect(old.status).toBe('RESCHEDULED');
  });

  it('rejects due dates in the past and unknown actions', async () => {
    const lead = await prisma.lead.findFirstOrThrow({ where: { assignedToId: salesId } });
    expect((await request(app).post('/api/follow-ups').set(auth(sales)).send({ leadId: lead.id, dueAt: addDays(today, -1) })).status).toBe(400);
    const fu = await request(app).post('/api/follow-ups').set(auth(sales)).send({ leadId: lead.id, dueAt: addHours(tomorrow, 12) });
    expect(fu.status).toBe(201);
    expect((await request(app).patch(`/api/follow-ups/${fu.body.followUp.id}`).set(auth(sales)).send({ action: 'delete' })).status).toBe(400);
  });

  it('admin can monitor all follow-ups', async () => {
    const res = await request(app).get('/api/follow-ups?scope=all').set(auth(admin));
    const owners = new Set(res.body.followUps.map((f: { executive: { id: string } }) => f.executive.id));
    expect(owners.has(salesId) && owners.has(sales2Id)).toBe(true);
  });
});

describe('CSV reports', () => {
  it('escapes commas, quotes, newlines and formula injection', () => {
    expect(escapeCell('plain')).toBe('plain');
    expect(escapeCell('a,b')).toBe('"a,b"');
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCell(null)).toBe('');
    expect(toCsv(['A', 'B'], [[1, 'x,y']])).toBe('﻿A,B\r\n1,"x,y"\r\n');
  });

  it('leads report: CSV attachment, one row per lead, relevant columns, no secrets', async () => {
    const res = await request(app).get('/api/reports/leads').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/);
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toContain('Customer Name');
    expect(lines[0]).toContain('Assigned Executive');
    expect(lines[0]).toContain('Last Call Outcome');
    expect(lines[0]).toContain('Next Follow-up (IST)');
    expect(lines.length - 1).toBe(await prisma.lead.count());
    expect(res.text).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('call history report has one row per call', async () => {
    const res = await request(app).get('/api/reports/calls').set(auth(admin));
    const rows = res.text.trim().split('\r\n').length - 1;
    expect(rows).toBe(await prisma.call.count());
    expect(res.text).toContain('Outcome');
  });

  it('performance report has one row per executive plus a team total', async () => {
    const res = await request(app).get('/api/reports/performance').set(auth(admin));
    const lines = res.text.trim().split('\r\n');
    const execs = await prisma.user.count({ where: { role: 'SALES_EXECUTIVE' } });
    expect(lines.length).toBe(1 + execs + 1);
    expect(lines[0]).toContain('Call Coverage Rate (%)');
    expect(lines.at(-1)).toMatch(/^TEAM TOTAL/);
  });
});
