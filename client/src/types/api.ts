export type Role = 'ADMIN' | 'SALES_EXECUTIVE';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'VISIT_SCHEDULED' | 'CONVERTED' | 'LOST';
export type PropertyCategory = 'PG' | 'CO_LIVING' | 'HOSTEL' | 'APARTMENT' | 'STUDIO';
export type LeadSource = 'WEBSITE' | 'WALK_IN' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'PROPERTY_PORTAL' | 'PHONE';
export type CallOutcome = 'CONNECTED' | 'NOT_ANSWERED' | 'BUSY' | 'SWITCHED_OFF' | 'INTERESTED' | 'NOT_INTERESTED' | 'CALL_BACK_REQUESTED' | 'VISIT_SCHEDULED' | 'CONVERTED';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED';
export interface User { id: string; name: string; email: string; role: Role; }
export interface UserRef { id: string; name: string; }
export interface Lead {
 id: string; customerName: string; mobile: string; email: string | null;
 propertyCategory: PropertyCategory; preferredLocation: string; budget: number;
 leadSource: LeadSource; status: LeadStatus; enquiryDate: string;
 assignedToId: string | null; assignedTo: UserRef | null; createdAt: string; updatedAt: string;
}
export interface Call {
 id: string; leadId: string; lead: { id: string; customerName: string; mobile: string };
 executive: UserRef; calledAt: string; durationSeconds: number; outcome: CallOutcome;
 notes: string | null; nextFollowUpAt: string | null; createdAt: string;
}
export interface FollowUp {
 id: string; leadId: string; lead: { id: string; customerName: string; mobile: string; status: LeadStatus };
 executive: UserRef; dueAt: string; status: FollowUpStatus; notes: string | null;
 completedAt: string | null; createdAt: string;
}
export interface Metrics { callCoverageRate: number; conversionRate: number; connectionRate: number; }
export type Executive = UserRef & { email: string };
export type ExecutivePerformance = Executive & { assignedLeads: number; leadsContacted: number; totalCalls: number; connectedCalls: number; convertedLeads: number; pendingFollowUps: number; overdueFollowUps: number } & Metrics;
export interface ExecutiveTotals { assignedLeads: number; leadsContacted: number; totalCalls: number; connectedCalls: number; pendingFollowUps: number; overdueFollowUps: number; todayFollowUps: number; convertedLeads: number; }
export type Dashboard = { role: 'ADMIN'; totals: ExecutiveTotals & { totalLeads: number; unassignedLeads: number }; metrics: Metrics; executives: ExecutivePerformance[] } | { role: 'SALES_EXECUTIVE'; totals: ExecutiveTotals; metrics: Metrics };
export const LEAD_STATUSES: LeadStatus[] = ['NEW','CONTACTED','INTERESTED','VISIT_SCHEDULED','CONVERTED','LOST'];
export const PROPERTY_CATEGORIES: PropertyCategory[] = ['PG','CO_LIVING','HOSTEL','APARTMENT','STUDIO'];
export const LEAD_SOURCES: LeadSource[] = ['WEBSITE','WALK_IN','REFERRAL','SOCIAL_MEDIA','PROPERTY_PORTAL','PHONE'];
export const CALL_OUTCOMES: CallOutcome[] = ['CONNECTED','NOT_ANSWERED','BUSY','SWITCHED_OFF','INTERESTED','NOT_INTERESTED','CALL_BACK_REQUESTED','VISIT_SCHEDULED','CONVERTED'];
