/**
 * Demo seed — FICTIONAL data only. Rerunnable: wipes all CRM tables and recreates them.
 * Demo credentials below are intentionally public for the assessment.
 * Dates are relative to "now" so today / upcoming / overdue follow-ups always exist at demo time.
 */
import {
  PrismaClient,
  CallOutcome,
  LeadStatus,
  PropertyCategory,
  LeadSource,
  FollowUpStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addHours, startOfTodayIST } from '../src/lib/time';

const prisma = new PrismaClient();

type FollowUpPlan = 'overdue' | 'today' | 'upcoming' | 'completed' | null;

interface LeadSeed {
  name: string;
  mobile: string;
  category: PropertyCategory;
  location: string;
  budget: number;
  source: LeadSource;
  status: LeadStatus;
  enquiryDaysAgo: number;
  owner: 'sales' | 'sales2' | null;
  calls: CallOutcome[]; // chronological
  followUp: FollowUpPlan;
}

const C = CallOutcome;
const S = LeadStatus;
const P = PropertyCategory;
const L = LeadSource;

const leads: LeadSeed[] = [
  // ---- assigned to sales@pgfy.demo (12) ----
  { name: 'Aarav Sharma', mobile: '9845012301', category: P.PG, location: 'Koramangala', budget: 12000, source: L.WEBSITE, status: S.INTERESTED, enquiryDaysAgo: 14, owner: 'sales', calls: [C.NOT_ANSWERED, C.CONNECTED, C.INTERESTED], followUp: 'today' },
  { name: 'Diya Reddy', mobile: '9900123402', category: P.CO_LIVING, location: 'HSR Layout', budget: 18000, source: L.PROPERTY_PORTAL, status: S.CONVERTED, enquiryDaysAgo: 20, owner: 'sales', calls: [C.CONNECTED, C.VISIT_SCHEDULED, C.CONVERTED], followUp: 'completed' },
  { name: 'Vihaan Nair', mobile: '8123456703', category: P.HOSTEL, location: 'Electronic City', budget: 8000, source: L.REFERRAL, status: S.CONTACTED, enquiryDaysAgo: 9, owner: 'sales', calls: [C.BUSY, C.SWITCHED_OFF], followUp: 'overdue' },
  { name: 'Ananya Iyer', mobile: '9741234504', category: P.APARTMENT, location: 'Whitefield', budget: 35000, source: L.SOCIAL_MEDIA, status: S.VISIT_SCHEDULED, enquiryDaysAgo: 11, owner: 'sales', calls: [C.CONNECTED, C.CALL_BACK_REQUESTED, C.VISIT_SCHEDULED], followUp: 'upcoming' },
  { name: 'Kabir Malhotra', mobile: '7022345605', category: P.STUDIO, location: 'Indiranagar', budget: 25000, source: L.WALK_IN, status: S.LOST, enquiryDaysAgo: 25, owner: 'sales', calls: [C.CONNECTED, C.NOT_INTERESTED], followUp: null },
  { name: 'Ishita Gupta', mobile: '9632145606', category: P.PG, location: 'BTM Layout', budget: 10000, source: L.WEBSITE, status: S.CONTACTED, enquiryDaysAgo: 6, owner: 'sales', calls: [C.NOT_ANSWERED, C.CALL_BACK_REQUESTED], followUp: 'overdue' },
  { name: 'Reyansh Joshi', mobile: '8095123407', category: P.CO_LIVING, location: 'Marathahalli', budget: 16000, source: L.PHONE, status: S.CONVERTED, enquiryDaysAgo: 18, owner: 'sales', calls: [C.CONNECTED, C.INTERESTED, C.CONVERTED], followUp: null },
  { name: 'Saanvi Kulkarni', mobile: '9880234508', category: P.PG, location: 'Jayanagar', budget: 11000, source: L.REFERRAL, status: S.INTERESTED, enquiryDaysAgo: 5, owner: 'sales', calls: [C.CONNECTED, C.INTERESTED], followUp: 'upcoming' },
  { name: 'Arjun Menon', mobile: '7259345609', category: P.HOSTEL, location: 'Yelahanka', budget: 7500, source: L.SOCIAL_MEDIA, status: S.NEW, enquiryDaysAgo: 2, owner: 'sales', calls: [], followUp: null },
  { name: 'Myra Desai', mobile: '9611456710', category: P.APARTMENT, location: 'Hebbal', budget: 30000, source: L.PROPERTY_PORTAL, status: S.NEW, enquiryDaysAgo: 1, owner: 'sales', calls: [], followUp: null },
  { name: 'Advik Rao', mobile: '8970567811', category: P.STUDIO, location: 'Bellandur', budget: 22000, source: L.WEBSITE, status: S.CONTACTED, enquiryDaysAgo: 4, owner: 'sales', calls: [C.SWITCHED_OFF, C.NOT_ANSWERED], followUp: 'today' },
  { name: 'Kiara Pillai', mobile: '9535678912', category: P.CO_LIVING, location: 'Sarjapur Road', budget: 17000, source: L.WALK_IN, status: S.INTERESTED, enquiryDaysAgo: 8, owner: 'sales', calls: [C.CONNECTED, C.CALL_BACK_REQUESTED, C.INTERESTED], followUp: 'overdue' },

  // ---- assigned to sales2@pgfy.demo (8) ----
  { name: 'Rohan Bhat', mobile: '9449789013', category: P.PG, location: 'Malleshwaram', budget: 9500, source: L.PHONE, status: S.CONVERTED, enquiryDaysAgo: 22, owner: 'sales2', calls: [C.CONNECTED, C.CONVERTED], followUp: null },
  { name: 'Tara Hegde', mobile: '8762890114', category: P.APARTMENT, location: 'JP Nagar', budget: 28000, source: L.REFERRAL, status: S.VISIT_SCHEDULED, enquiryDaysAgo: 10, owner: 'sales2', calls: [C.BUSY, C.CONNECTED, C.VISIT_SCHEDULED], followUp: 'today' },
  { name: 'Aditya Shetty', mobile: '9986901215', category: P.HOSTEL, location: 'Banashankari', budget: 7000, source: L.WEBSITE, status: S.CONTACTED, enquiryDaysAgo: 7, owner: 'sales2', calls: [C.NOT_ANSWERED, C.BUSY, C.NOT_ANSWERED], followUp: 'overdue' },
  { name: 'Meera Krishnan', mobile: '7406012316', category: P.CO_LIVING, location: 'Koramangala', budget: 19000, source: L.SOCIAL_MEDIA, status: S.INTERESTED, enquiryDaysAgo: 3, owner: 'sales2', calls: [C.CONNECTED, C.INTERESTED], followUp: 'upcoming' },
  { name: 'Nikhil Verma', mobile: '9036123417', category: P.STUDIO, location: 'Indiranagar', budget: 26000, source: L.PROPERTY_PORTAL, status: S.LOST, enquiryDaysAgo: 16, owner: 'sales2', calls: [C.CONNECTED, C.NOT_INTERESTED], followUp: null },
  { name: 'Pooja Agarwal', mobile: '8217234518', category: P.PG, location: 'Rajajinagar', budget: 10500, source: L.WALK_IN, status: S.NEW, enquiryDaysAgo: 1, owner: 'sales2', calls: [], followUp: null },
  { name: 'Siddharth Rao', mobile: '9164345619', category: P.APARTMENT, location: 'Whitefield', budget: 40000, source: L.REFERRAL, status: S.CONTACTED, enquiryDaysAgo: 5, owner: 'sales2', calls: [C.SWITCHED_OFF, C.CALL_BACK_REQUESTED], followUp: 'today' },
  { name: 'Lavanya Gowda', mobile: '7899456720', category: P.HOSTEL, location: 'Electronic City', budget: 8500, source: L.PHONE, status: S.INTERESTED, enquiryDaysAgo: 12, owner: 'sales2', calls: [C.CONNECTED, C.INTERESTED, C.CALL_BACK_REQUESTED], followUp: 'completed' },

  // ---- unassigned (4) ----
  { name: 'Harsh Patil', mobile: '9741567821', category: P.CO_LIVING, location: 'HSR Layout', budget: 15000, source: L.WEBSITE, status: S.NEW, enquiryDaysAgo: 0, owner: null, calls: [], followUp: null },
  { name: 'Nisha Fernandes', mobile: '8050678922', category: P.PG, location: 'Frazer Town', budget: 9000, source: L.SOCIAL_MEDIA, status: S.NEW, enquiryDaysAgo: 1, owner: null, calls: [], followUp: null },
  { name: 'Yash Chawla', mobile: '9900789023', category: P.STUDIO, location: 'MG Road', budget: 32000, source: L.PROPERTY_PORTAL, status: S.NEW, enquiryDaysAgo: 2, owner: null, calls: [], followUp: null },
  { name: 'Zoya Khan', mobile: '7338890124', category: P.APARTMENT, location: 'Hennur', budget: 27000, source: L.REFERRAL, status: S.NEW, enquiryDaysAgo: 0, owner: null, calls: [], followUp: null },
];

const NOTES: Record<CallOutcome, string> = {
  CONNECTED: 'Spoke briefly, shared property options on WhatsApp.',
  NOT_ANSWERED: 'No answer. Will try again.',
  BUSY: 'Line busy.',
  SWITCHED_OFF: 'Phone switched off.',
  INTERESTED: 'Interested, asked about food and Wi-Fi inclusions.',
  NOT_INTERESTED: 'Found another place, not interested now.',
  CALL_BACK_REQUESTED: 'Asked to call back in the evening.',
  VISIT_SCHEDULED: 'Site visit scheduled with the property manager.',
  CONVERTED: 'Booking confirmed, token amount paid.',
};

const CONNECTED_DURATIONS = [95, 180, 240, 310, 420];

function dueDateFor(plan: Exclude<FollowUpPlan, null>, now: Date): Date {
  const today = startOfTodayIST(now);
  switch (plan) {
    case 'overdue':
      return addHours(addDays(today, -2), 11); // 2 days ago, 11:00 IST
    case 'today':
      return addHours(today, 17); // today, 17:00 IST
    case 'upcoming':
      return addHours(addDays(today, 3), 11); // in 3 days, 11:00 IST
    case 'completed':
      return addHours(addDays(today, -1), 15);
  }
}

async function main() {
  const now = new Date();

  // Wipe in FK order so the seed can be rerun safely.
  await prisma.followUp.deleteMany();
  await prisma.call.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();

  const [adminHash, salesHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Sales@123', 10),
  ]);

  await prisma.user.create({
    data: { name: 'Kavya Rao', email: 'admin@pgfy.demo', passwordHash: adminHash, role: 'ADMIN' },
  });
  const sales = await prisma.user.create({
    data: { name: 'Rahul Kumar', email: 'sales@pgfy.demo', passwordHash: salesHash, role: 'SALES_EXECUTIVE' },
  });
  const sales2 = await prisma.user.create({
    data: { name: 'Sneha Iyer', email: 'sales2@pgfy.demo', passwordHash: salesHash, role: 'SALES_EXECUTIVE' },
  });
  const owners = { sales: sales.id, sales2: sales2.id };

  let callCount = 0;
  let followUpCount = 0;

  for (const [i, l] of leads.entries()) {
    const enquiryDate = addHours(addDays(now, -l.enquiryDaysAgo), -2);
    const executiveId = l.owner ? owners[l.owner] : null;

    const lead = await prisma.lead.create({
      data: {
        customerName: l.name,
        mobile: l.mobile,
        email: `${l.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        propertyCategory: l.category,
        preferredLocation: l.location,
        budget: l.budget,
        leadSource: l.source,
        status: l.status,
        enquiryDate,
        assignedToId: executiveId,
      },
    });

    if (!executiveId) continue;

    const dueAt = l.followUp ? dueDateFor(l.followUp, now) : null;

    // Spread calls between the enquiry date and ~3 hours ago, in order.
    const span = Math.max(now.getTime() - 3 * 3600_000 - enquiryDate.getTime(), 3600_000);
    for (const [j, outcome] of l.calls.entries()) {
      const calledAt = new Date(enquiryDate.getTime() + (span * (j + 1)) / (l.calls.length + 1));
      const connected = !['NOT_ANSWERED', 'BUSY', 'SWITCHED_OFF'].includes(outcome);
      const isLast = j === l.calls.length - 1;
      await prisma.call.create({
        data: {
          leadId: lead.id,
          executiveId,
          calledAt,
          durationSeconds: connected ? CONNECTED_DURATIONS[(i + j) % CONNECTED_DURATIONS.length] : 0,
          outcome,
          notes: NOTES[outcome],
          nextFollowUpAt: isLast ? dueAt : null,
        },
      });
      callCount++;
    }

    if (l.followUp && dueAt) {
      const completed = l.followUp === 'completed';
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          executiveId,
          dueAt,
          status: completed ? FollowUpStatus.COMPLETED : FollowUpStatus.PENDING,
          completedAt: completed ? addHours(dueAt, 1) : null,
          notes: completed ? 'Follow-up call done.' : 'Call to confirm requirements and visit slot.',
        },
      });
      followUpCount++;
    }
  }

  console.log(
    `Seeded 3 users, ${leads.length} leads, ${callCount} calls, ${followUpCount} follow-ups (fictional data).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
