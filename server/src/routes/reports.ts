import { Router, type Response } from 'express';
import { prisma } from '../db';
import { toCsv } from '../lib/csv';
import { executivePerformance, metricsFrom } from '../lib/metrics';
import { CONNECTED_OUTCOMES } from '../lib/shapes';
import { istDateStamp } from '../lib/time';
import { requireRole } from '../middleware/auth';

const router = Router();
router.use(requireRole('ADMIN')); // every report is admin-only

function sendCsv(res: Response, name: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${istDateStamp()}.csv"`);
  res.send(csv);
}

// All leads with assignment, call summary and next follow-up. No password hashes or internal fields.
router.get('/leads', async (_req, res) => {
  const leads = await prisma.lead.findMany({
    orderBy: { enquiryDate: 'desc' },
    include: {
      assignedTo: { select: { name: true, email: true } },
      calls: { orderBy: { calledAt: 'desc' }, select: { calledAt: true, outcome: true } },
      followUps: { where: { status: 'PENDING' }, orderBy: { dueAt: 'asc' }, select: { dueAt: true } },
    },
  });

  const csv = toCsv(
    ['Lead ID', 'Customer Name', 'Mobile', 'Email', 'Property Category', 'Preferred Location', 'Budget (INR)', 'Lead Source', 'Status', 'Enquiry Date (IST)', 'Assigned Executive', 'Executive Email', 'Total Calls', 'Last Call (IST)', 'Last Call Outcome', 'Next Follow-up (IST)', 'Pending Follow-ups'],
    leads.map((l) => [
      l.id, l.customerName, l.mobile, l.email, l.propertyCategory, l.preferredLocation, l.budget, l.leadSource,
      l.status, l.enquiryDate, l.assignedTo?.name ?? 'Unassigned', l.assignedTo?.email, l.calls.length,
      l.calls[0]?.calledAt, l.calls[0]?.outcome, l.followUps[0]?.dueAt, l.followUps.length,
    ]),
  );
  sendCsv(res, 'leads', csv);
});

// Every call ever recorded (append-only history), newest first.
router.get('/calls', async (_req, res) => {
  const calls = await prisma.call.findMany({
    orderBy: { calledAt: 'desc' },
    include: {
      lead: { select: { customerName: true, mobile: true, status: true, assignedTo: { select: { name: true } } } },
      executive: { select: { name: true } },
    },
  });

  const csv = toCsv(
    ['Call ID', 'Called At (IST)', 'Lead ID', 'Customer Name', 'Mobile', 'Called By', 'Current Assignee', 'Outcome', 'Connected', 'Duration (sec)', 'Notes', 'Next Follow-up (IST)', 'Lead Status'],
    calls.map((c) => [
      c.id, c.calledAt, c.leadId, c.lead.customerName, c.lead.mobile, c.executive.name,
      c.lead.assignedTo?.name ?? 'Unassigned', c.outcome, CONNECTED_OUTCOMES.includes(c.outcome) ? 'Yes' : 'No',
      c.durationSeconds, c.notes, c.nextFollowUpAt, c.lead.status,
    ]),
  );
  sendCsv(res, 'call-history', csv);
});

// Per-executive performance with the three assignment metrics, plus a team total row.
router.get('/performance', async (_req, res) => {
  const rows = await executivePerformance();
  const sum = (k: 'assignedLeads' | 'leadsContacted' | 'totalCalls' | 'connectedCalls' | 'convertedLeads' | 'pendingFollowUps' | 'overdueFollowUps') =>
    rows.reduce((acc, r) => acc + r[k], 0);
  const total = {
    assignedLeads: sum('assignedLeads'), leadsContacted: sum('leadsContacted'), totalCalls: sum('totalCalls'),
    connectedCalls: sum('connectedCalls'), convertedLeads: sum('convertedLeads'),
    pendingFollowUps: sum('pendingFollowUps'), overdueFollowUps: sum('overdueFollowUps'),
  };
  const totalMetrics = metricsFrom(total);

  const csv = toCsv(
    ['Executive', 'Email', 'Assigned Leads', 'Leads Contacted', 'Total Calls', 'Connected Calls', 'Converted Leads', 'Pending Follow-ups', 'Overdue Follow-ups', 'Call Coverage Rate (%)', 'Conversion Rate (%)', 'Connection Rate (%)'],
    [
      ...rows.map((r) => [
        r.name, r.email, r.assignedLeads, r.leadsContacted, r.totalCalls, r.connectedCalls, r.convertedLeads,
        r.pendingFollowUps, r.overdueFollowUps, r.callCoverageRate, r.conversionRate, r.connectionRate,
      ]),
      ['TEAM TOTAL', '', total.assignedLeads, total.leadsContacted, total.totalCalls, total.connectedCalls,
        total.convertedLeads, total.pendingFollowUps, total.overdueFollowUps, totalMetrics.callCoverageRate,
        totalMetrics.conversionRate, totalMetrics.connectionRate],
    ],
  );
  sendCsv(res, 'executive-performance', csv);
});

export default router;
