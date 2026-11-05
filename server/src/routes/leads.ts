import { Router } from 'express';
import { z } from 'zod';
import { LeadSource, LeadStatus, PropertyCategory, type Prisma } from '@prisma/client';
import { prisma } from '../db';
import { badRequest, parse } from '../lib/http';
import { getAccessibleLead, leadInclude } from '../lib/shapes';
import { currentUser, requireRole } from '../middleware/auth';

const router = Router();

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const leadFields = {
  customerName: z.string().trim().min(2).max(100),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Mobile must be a 10-digit Indian number starting with 6-9'),
  email: z.preprocess(emptyToNull, z.string().trim().toLowerCase().email().max(120).nullable().optional()),
  propertyCategory: z.enum(PropertyCategory),
  preferredLocation: z.string().trim().min(2).max(100),
  budget: z.coerce.number().int().positive().max(10_000_000),
  leadSource: z.enum(LeadSource),
  status: z.enum(LeadStatus).optional(),
  enquiryDate: z.coerce.date().optional(),
};

// .strict() rejects unknown keys -> no mass assignment of fields like id/createdAt.
const createSchema = z
  .object({ ...leadFields, assignedToId: z.string().min(1).nullable().optional() })
  .strict();
const adminUpdateSchema = z
  .object(leadFields)
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, 'Provide at least one field to update');
const executiveUpdateSchema = z.object({ status: z.enum(LeadStatus) }).strict();
const assignSchema = z.object({ assignedToId: z.string().min(1).nullable() }).strict();
const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(LeadStatus).optional(),
  assignedToId: z.string().min(1).optional(),
});

async function ensureExecutive(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user || user.role !== 'SALES_EXECUTIVE') throw badRequest('assignedToId must be an existing sales executive');
}

// GET /api/leads — admin: all; executive: only assigned to them.
router.get('/', async (req, res) => {
  const user = currentUser(req);
  const q = parse(listQuerySchema, req.query);

  const where: Prisma.LeadWhereInput = {};
  if (user.role === 'SALES_EXECUTIVE') where.assignedToId = user.id;
  else if (q.assignedToId) where.assignedToId = q.assignedToId === 'unassigned' ? null : q.assignedToId;
  if (q.status) where.status = q.status;
  if (q.search) {
    const contains = { contains: q.search, mode: 'insensitive' as const };
    where.OR = [
      { customerName: contains },
      { mobile: contains },
      { email: contains },
      { preferredLocation: contains },
    ];
  }

  const leads = await prisma.lead.findMany({ where, include: leadInclude, orderBy: { enquiryDate: 'desc' } });
  res.json({ leads });
});

router.get('/:id', async (req, res) => {
  const lead = await getAccessibleLead(req.params.id, currentUser(req));
  res.json({ lead });
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const data = parse(createSchema, req.body);
  if (data.assignedToId) await ensureExecutive(data.assignedToId);
  const lead = await prisma.lead.create({ data, include: leadInclude });
  res.status(201).json({ lead });
});

// PATCH /api/leads/:id — admin edits any lead field (not assignment); executive edits status of own lead only.
router.patch('/:id', async (req, res) => {
  const user = currentUser(req);
  const existing = await getAccessibleLead(req.params.id, user);
  const data =
    user.role === 'ADMIN' ? parse(adminUpdateSchema, req.body) : parse(executiveUpdateSchema, req.body);
  const lead = await prisma.lead.update({ where: { id: existing.id }, data, include: leadInclude });
  res.json({ lead });
});

// PATCH /api/leads/:id/assign — admin only. Pending follow-ups move to the new owner; calls keep their original caller.
router.patch('/:id/assign', requireRole('ADMIN'), async (req, res) => {
  const { assignedToId } = parse(assignSchema, req.body);
  const existing = await getAccessibleLead(String(req.params.id), currentUser(req));
  if (assignedToId) await ensureExecutive(assignedToId);

  const lead = await prisma.$transaction(async (tx) => {
    if (assignedToId && assignedToId !== existing.assignedToId) {
      await tx.followUp.updateMany({
        where: { leadId: existing.id, status: 'PENDING' },
        data: { executiveId: assignedToId },
      });
    }
    return tx.lead.update({ where: { id: existing.id }, data: { assignedToId }, include: leadInclude });
  });
  res.json({ lead });
});

export default router;
