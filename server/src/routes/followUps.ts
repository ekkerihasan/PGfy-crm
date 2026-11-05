import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { badRequest, forbidden, notFound, parse } from '../lib/http';
import { followUpInclude, getAccessibleLead } from '../lib/shapes';
import { addDays, startOfTodayIST, startOfTomorrowIST } from '../lib/time';
import { currentUser, type AuthUser } from '../middleware/auth';

const router = Router();

const SCOPES = ['today', 'upcoming', 'overdue', 'completed', 'all'] as const;
type Scope = (typeof SCOPES)[number];

const listQuerySchema = z.object({
  scope: z.enum(SCOPES).default('all'),
  leadId: z.string().min(1).optional(),
});

const dueAtSchema = z.coerce.date();
const notesSchema = z.string().trim().max(2000).nullable().optional();

const createSchema = z.object({ leadId: z.string().min(1), dueAt: dueAtSchema, notes: notesSchema }).strict();
const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete'), notes: notesSchema }).strict(),
  z.object({ action: z.literal('reschedule'), dueAt: dueAtSchema, notes: notesSchema }).strict(),
]);

/** Where-clause for a scope. today/upcoming/overdue only ever include PENDING items (IST day boundaries). */
export function scopeWhere(scope: Scope, now = new Date()): Prisma.FollowUpWhereInput {
  const today = startOfTodayIST(now);
  const tomorrow = startOfTomorrowIST(now);
  switch (scope) {
    case 'overdue':
      return { status: 'PENDING', dueAt: { lt: today } };
    case 'today':
      return { status: 'PENDING', dueAt: { gte: today, lt: tomorrow } };
    case 'upcoming':
      return { status: 'PENDING', dueAt: { gte: tomorrow } };
    case 'completed':
      return { status: 'COMPLETED' };
    case 'all':
      return {};
  }
}

function validateDueAt(dueAt: Date) {
  const now = new Date();
  if (dueAt < startOfTodayIST(now)) throw badRequest('dueAt cannot be before today');
  if (dueAt > addDays(now, 366)) throw badRequest('dueAt must be within one year');
}

function requireExecutive(user: AuthUser) {
  if (user.role !== 'SALES_EXECUTIVE') throw forbidden('Only the assigned sales executive can manage follow-ups');
}

// GET /api/follow-ups?scope= — admin: all (monitoring); executive: follow-ups on leads assigned to them.
router.get('/', async (req, res) => {
  const user = currentUser(req);
  const { scope, leadId } = parse(listQuerySchema, req.query);
  const where: Prisma.FollowUpWhereInput = { ...scopeWhere(scope) };
  if (user.role === 'SALES_EXECUTIVE') where.lead = { assignedToId: user.id };
  if (leadId) where.leadId = leadId;

  const followUps = await prisma.followUp.findMany({
    where,
    include: followUpInclude,
    orderBy: { dueAt: scope === 'completed' ? 'desc' : 'asc' },
  });
  res.json({ followUps });
});

router.post('/', async (req, res) => {
  const user = currentUser(req);
  requireExecutive(user);
  const body = parse(createSchema, req.body);
  const lead = await getAccessibleLead(body.leadId, user);
  validateDueAt(body.dueAt);

  const followUp = await prisma.followUp.create({
    data: { leadId: lead.id, executiveId: user.id, dueAt: body.dueAt, notes: body.notes ?? null },
    include: followUpInclude,
  });
  res.status(201).json({ followUp });
});

// PATCH /api/follow-ups/:id — complete, or reschedule (old one marked RESCHEDULED, new PENDING one created).
router.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  requireExecutive(user);
  const body = parse(patchSchema, req.body);

  const existing = await prisma.followUp.findUnique({
    where: { id: req.params.id },
    include: { lead: { select: { assignedToId: true } } },
  });
  if (!existing || existing.lead.assignedToId !== user.id) throw notFound('Follow-up not found');
  if (existing.status !== 'PENDING') throw badRequest(`Follow-up is already ${existing.status.toLowerCase()}`);

  if (body.action === 'complete') {
    const followUp = await prisma.followUp.update({
      where: { id: existing.id },
      data: { status: 'COMPLETED', completedAt: new Date(), ...(body.notes ? { notes: body.notes } : {}) },
      include: followUpInclude,
    });
    res.json({ followUp });
    return;
  }

  validateDueAt(body.dueAt);
  const followUp = await prisma.$transaction(async (tx) => {
    await tx.followUp.update({ where: { id: existing.id }, data: { status: 'RESCHEDULED' } });
    return tx.followUp.create({
      data: {
        leadId: existing.leadId,
        executiveId: user.id,
        dueAt: body.dueAt,
        notes: body.notes ?? existing.notes,
      },
      include: followUpInclude,
    });
  });
  res.json({ followUp });
});

export default router;
