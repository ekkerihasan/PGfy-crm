import type { CallOutcome, Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { AuthUser } from '../middleware/auth';
import { notFound } from './http';

// Prisma `include` objects that produce exactly the JSON shapes in docs/API_CONTRACT.md.
export const userRef = { select: { id: true, name: true } } as const;

export const leadInclude = { assignedTo: userRef } satisfies Prisma.LeadInclude;

export const callInclude = {
  lead: { select: { id: true, customerName: true, mobile: true } },
  executive: userRef,
} satisfies Prisma.CallInclude;

export const followUpInclude = {
  lead: { select: { id: true, customerName: true, mobile: true, status: true } },
  executive: userRef,
} satisfies Prisma.FollowUpInclude;

/** Outcomes where the customer actually picked up. Assumption documented in README. */
export const CONNECTED_OUTCOMES: CallOutcome[] = [
  'CONNECTED',
  'INTERESTED',
  'NOT_INTERESTED',
  'CALL_BACK_REQUESTED',
  'VISIT_SCHEDULED',
  'CONVERTED',
];

/**
 * Ownership check used by every lead-scoped route.
 * Admin sees any lead; an executive only leads assigned to them.
 * Returns 404 (not 403) for other people's leads so IDs can't be probed.
 */
export async function getAccessibleLead(id: string, user: AuthUser) {
  const lead = await prisma.lead.findUnique({ where: { id }, include: leadInclude });
  if (!lead) throw notFound('Lead not found');
  if (user.role === 'SALES_EXECUTIVE' && lead.assignedToId !== user.id) throw notFound('Lead not found');
  return lead;
}
