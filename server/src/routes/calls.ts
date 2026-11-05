import { Router } from 'express';
import { z } from 'zod';
import { CallOutcome, type Prisma } from '@prisma/client';
import { prisma } from '../db';
import { badRequest, forbidden, parse } from '../lib/http';
import { callInclude, followUpInclude, getAccessibleLead } from '../lib/shapes';
import { startOfTodayIST } from '../lib/time';
import { currentUser } from '../middleware/auth';

const router = Router();

const createCallSchema = z
  .object({
    outcome: z.enum(CallOutcome),
    durationSeconds: z.coerce.number().int().min(0).max(4 * 60 * 60),
    notes: z.string().trim().max(2000).nullable().optional(),
    calledAt: z.coerce.date().optional(),
    nextFollowUpAt: z.coerce.date().nullable().optional(),
  })
  .strict();

const listQuerySchema = z.object({
  executiveId: z.string().min(1).optional(),
  outcome: z.enum(CallOutcome).optional(),
});

// GET /api/leads/:id/calls — full call history for a lead (admin or assigned executive).
router.get('/leads/:id/calls', async (req, res) => {
  const lead = await getAccessibleLead(req.params.id, currentUser(req));
  const calls = await prisma.call.findMany({
    where: { leadId: lead.id },
    include: callInclude,
    orderBy: { calledAt: 'desc' },
  });
  res.json({ calls });
});

// POST /api/leads/:id/calls — only the assigned executive records calls. Always INSERTs: history is never overwritten.
router.post('/leads/:id/calls', async (req, res) => {
  const user = currentUser(req);
  if (user.role !== 'SALES_EXECUTIVE') throw forbidden('Only the assigned sales executive can record calls');
  const lead = await getAccessibleLead(req.params.id, user);
  const body = parse(createCallSchema, req.body);

  const now = new Date();
  const calledAt = body.calledAt ?? now;
  if (calledAt.getTime() > now.getTime() + 5 * 60_000) throw badRequest('calledAt cannot be in the future');
  if (body.nextFollowUpAt && body.nextFollowUpAt < startOfTodayIST(now)) {
    throw badRequest('nextFollowUpAt cannot be before today');
  }

  const result = await prisma.$transaction(async (tx) => {
    const call = await tx.call.create({
      data: {
        leadId: lead.id,
        executiveId: user.id, // from the JWT, never from the body
        calledAt,
        durationSeconds: body.durationSeconds,
        outcome: body.outcome,
        notes: body.notes ?? null,
        nextFollowUpAt: body.nextFollowUpAt ?? null,
      },
      include: callInclude,
    });

    const followUp = body.nextFollowUpAt
      ? await tx.followUp.create({
          data: {
            leadId: lead.id,
            executiveId: user.id,
            dueAt: body.nextFollowUpAt,
            notes: body.notes ? `From call: ${body.notes}`.slice(0, 2000) : null,
          },
          include: followUpInclude,
        })
      : null;

    // Small status automation (documented): first call moves NEW -> CONTACTED; a CONVERTED outcome converts the lead.
    if (body.outcome === 'CONVERTED') {
      await tx.lead.update({ where: { id: lead.id }, data: { status: 'CONVERTED' } });
    } else if (lead.status === 'NEW') {
      await tx.lead.update({ where: { id: lead.id }, data: { status: 'CONTACTED' } });
    }

    return { call, followUp };
  });

  res.status(201).json(result);
});

// GET /api/calls — admin: all calls (optional filters); executive: only calls they made.
router.get('/calls', async (req, res) => {
  const user = currentUser(req);
  const q = parse(listQuerySchema, req.query);
  const where: Prisma.CallWhereInput = {};
  if (user.role === 'SALES_EXECUTIVE') where.executiveId = user.id;
  else if (q.executiveId) where.executiveId = q.executiveId;
  if (q.outcome) where.outcome = q.outcome;

  const calls = await prisma.call.findMany({ where, include: callInclude, orderBy: { calledAt: 'desc' } });
  res.json({ calls });
});

export default router;
