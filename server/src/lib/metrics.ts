import { prisma } from '../db';
import { CONNECTED_OUTCOMES } from './shapes';
import { startOfTodayIST, startOfTomorrowIST } from './time';

/** Percentage rounded to 1 decimal; 0 when the denominator is 0. */
export function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export interface ExecutiveStats {
  assignedLeads: number;
  leadsContacted: number;
  totalCalls: number;
  connectedCalls: number;
  convertedLeads: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  todayFollowUps: number;
}

export function metricsFrom(s: Pick<ExecutiveStats, 'assignedLeads' | 'leadsContacted' | 'convertedLeads' | 'totalCalls' | 'connectedCalls'>) {
  return {
    callCoverageRate: rate(s.leadsContacted, s.assignedLeads),
    conversionRate: rate(s.convertedLeads, s.assignedLeads),
    connectionRate: rate(s.connectedCalls, s.totalCalls),
  };
}

/**
 * Stats for one executive.
 * - Lead-based numbers (assigned, contacted, converted, follow-ups) use the CURRENT assignee.
 * - "Contacted" = assigned lead with >= 1 call made by this executive; counted once per lead (no double-counting).
 * - Call-based numbers use the executive who MADE the call, so history stays with the original caller after reassignment.
 */
export async function executiveStats(executiveId: string, now = new Date()): Promise<ExecutiveStats> {
  const today = startOfTodayIST(now);
  const tomorrow = startOfTomorrowIST(now);
  const mine = { lead: { assignedToId: executiveId }, status: 'PENDING' as const };

  const [assignedLeads, leadsContacted, convertedLeads, totalCalls, connectedCalls, pendingFollowUps, overdueFollowUps, todayFollowUps] =
    await Promise.all([
      prisma.lead.count({ where: { assignedToId: executiveId } }),
      prisma.lead.count({ where: { assignedToId: executiveId, calls: { some: { executiveId } } } }),
      prisma.lead.count({ where: { assignedToId: executiveId, status: 'CONVERTED' } }),
      prisma.call.count({ where: { executiveId } }),
      prisma.call.count({ where: { executiveId, outcome: { in: CONNECTED_OUTCOMES } } }),
      prisma.followUp.count({ where: mine }),
      prisma.followUp.count({ where: { ...mine, dueAt: { lt: today } } }),
      prisma.followUp.count({ where: { ...mine, dueAt: { gte: today, lt: tomorrow } } }),
    ]);

  return { assignedLeads, leadsContacted, totalCalls, connectedCalls, convertedLeads, pendingFollowUps, overdueFollowUps, todayFollowUps };
}

export async function executivePerformance(now = new Date()) {
  const executives = await prisma.user.findMany({
    where: { role: 'SALES_EXECUTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  return Promise.all(
    executives.map(async (e) => {
      const stats = await executiveStats(e.id, now);
      return { ...e, ...stats, ...metricsFrom(stats) };
    }),
  );
}

export async function adminDashboard(now = new Date()) {
  const today = startOfTodayIST(now);
  const tomorrow = startOfTomorrowIST(now);
  const pending = { status: 'PENDING' as const };

  const [executives, totalLeads, assignedLeads, totalCalls, connectedCalls, convertedLeads, convertedAssigned, pendingFollowUps, overdueFollowUps, todayFollowUps] =
    await Promise.all([
      executivePerformance(now),
      prisma.lead.count(),
      prisma.lead.count({ where: { assignedToId: { not: null } } }),
      prisma.call.count(),
      prisma.call.count({ where: { outcome: { in: CONNECTED_OUTCOMES } } }),
      prisma.lead.count({ where: { status: 'CONVERTED' } }),
      prisma.lead.count({ where: { status: 'CONVERTED', assignedToId: { not: null } } }),
      prisma.followUp.count({ where: pending }),
      prisma.followUp.count({ where: { ...pending, dueAt: { lt: today } } }),
      prisma.followUp.count({ where: { ...pending, dueAt: { gte: today, lt: tomorrow } } }),
    ]);

  // Leads can only be assigned to executives, so overall "contacted" is the sum over executives.
  const leadsContacted = executives.reduce((sum, e) => sum + e.leadsContacted, 0);

  return {
    role: 'ADMIN' as const,
    totals: {
      totalLeads,
      assignedLeads,
      unassignedLeads: totalLeads - assignedLeads,
      leadsContacted,
      totalCalls,
      connectedCalls,
      pendingFollowUps,
      overdueFollowUps,
      todayFollowUps,
      convertedLeads,
    },
    metrics: metricsFrom({ assignedLeads, leadsContacted, convertedLeads: convertedAssigned, totalCalls, connectedCalls }),
    executives,
  };
}

export async function executiveDashboard(executiveId: string, now = new Date()) {
  const stats = await executiveStats(executiveId, now);
  return { role: 'SALES_EXECUTIVE' as const, totals: stats, metrics: metricsFrom(stats) };
}
