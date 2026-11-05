# PGfy Sales CRM — API Contract (FROZEN)

> Shared contract between **Claude Code (backend, `server/`)** and **Codex (frontend, `client/`)**.
> Only Claude edits this file. If the frontend needs a change, Codex writes it in `docs/CONTRACT_REQUESTS.md` and the developer relays it.

## Basics

- Backend base URL: `http://localhost:4000`. All routes are under `/api`.
- Frontend dev server: `http://localhost:5173`. Vite proxies `/api` → `http://localhost:4000`, so the client calls relative `/api/...`. Optional override: `VITE_API_URL`.
- Auth header on every protected route: `Authorization: Bearer <token>`.
- JSON everywhere except CSV reports. Dates are ISO-8601 strings (UTC). "Today" boundaries are computed in **Asia/Kolkata (IST)** on the server.
- Error shape (all 4xx/5xx): `{ "error": string, "details"?: unknown }`
  - `400` validation failed (`details` = field errors) · `401` missing/invalid/expired token or bad login · `403` role not allowed · `404` not found **or not yours** (executives get 404 for leads not assigned to them — existence is not leaked).

## Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@pgfy.demo | Admin@123 |
| SALES_EXECUTIVE | sales@pgfy.demo | Sales@123 |
| SALES_EXECUTIVE (2nd, for ownership tests) | sales2@pgfy.demo | Sales@123 |

## Enums (string values exactly as below)

```ts
type Role = 'ADMIN' | 'SALES_EXECUTIVE';
type LeadStatus = 'NEW' | 'CONTACTED' | 'INTERESTED' | 'VISIT_SCHEDULED' | 'CONVERTED' | 'LOST';
type PropertyCategory = 'PG' | 'CO_LIVING' | 'HOSTEL' | 'APARTMENT' | 'STUDIO';
type LeadSource = 'WEBSITE' | 'WALK_IN' | 'REFERRAL' | 'SOCIAL_MEDIA' | 'PROPERTY_PORTAL' | 'PHONE';
type CallOutcome =
  | 'CONNECTED' | 'NOT_ANSWERED' | 'BUSY' | 'SWITCHED_OFF' | 'INTERESTED'
  | 'NOT_INTERESTED' | 'CALL_BACK_REQUESTED' | 'VISIT_SCHEDULED' | 'CONVERTED';
type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'RESCHEDULED';
```

Display labels: replace `_` with space and title-case (e.g. `CALL_BACK_REQUESTED` → "Call Back Requested", `CO_LIVING` → "Co Living").

## Types

```ts
interface User { id: string; name: string; email: string; role: Role; }
interface UserRef { id: string; name: string; }

interface Lead {
  id: string;
  customerName: string;
  mobile: string;            // 10 digits
  email: string | null;
  propertyCategory: PropertyCategory;
  preferredLocation: string; // Bengaluru area, e.g. "Koramangala"
  budget: number;            // INR per month, integer
  leadSource: LeadSource;
  status: LeadStatus;
  enquiryDate: string;       // ISO
  assignedToId: string | null;
  assignedTo: UserRef | null;
  createdAt: string;
  updatedAt: string;
}

interface Call {
  id: string;
  leadId: string;
  lead: { id: string; customerName: string; mobile: string };
  executive: UserRef;
  calledAt: string;
  durationSeconds: number;
  outcome: CallOutcome;
  notes: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
}

interface FollowUp {
  id: string;
  leadId: string;
  lead: { id: string; customerName: string; mobile: string; status: LeadStatus };
  executive: UserRef;
  dueAt: string;
  status: FollowUpStatus;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Metrics { callCoverageRate: number; conversionRate: number; connectionRate: number; } // percentages, 1 decimal, 0 when denominator is 0
```

## Endpoints

### Auth
| Method | Path | Who | Body | 2xx response |
|---|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` | `200 { token: string, user: User }` · bad creds → `401 { error: "Invalid email or password" }` |
| GET | `/api/auth/me` | any logged in | — | `200 { user: User }` |

Token expires in 8h. On any `401` from a protected route the client should log out and go to `/login`.

### Users
| GET | `/api/users/executives` | ADMIN | — | `200 { executives: (UserRef & { email: string })[] }` (for the assign dropdown) |
|---|---|---|---|---|

### Leads
| Method | Path | Who | Body / query | 2xx response |
|---|---|---|---|---|
| GET | `/api/leads` | ADMIN: all · EXEC: only assigned | query: `search?` (name/mobile/email/location, case-insensitive), `status?` (LeadStatus), `assignedToId?` (ADMIN only; user id or `unassigned`) | `200 { leads: Lead[] }` newest enquiry first |
| GET | `/api/leads/:id` | ADMIN · assigned EXEC | — | `200 { lead: Lead }` |
| POST | `/api/leads` | ADMIN | `{ customerName, mobile, email?, propertyCategory, preferredLocation, budget, leadSource, status?, enquiryDate?, assignedToId? }` | `201 { lead: Lead }` |
| PATCH | `/api/leads/:id` | ADMIN: any field above **except** `assignedToId` · EXEC (own lead): `{ status }` only | partial body | `200 { lead: Lead }` · extra/forbidden fields → `400` |
| PATCH | `/api/leads/:id/assign` | ADMIN | `{ assignedToId: string \| null }` (null = unassign) | `200 { lead: Lead }` |

Validation: `mobile` = exactly 10 digits starting 6–9; `budget` positive integer; `email` valid or omitted/null.

### Calls (append-only — never updated or deleted)
| Method | Path | Who | Body / query | 2xx response |
|---|---|---|---|---|
| GET | `/api/leads/:id/calls` | ADMIN · assigned EXEC | — | `200 { calls: Call[] }` newest first |
| POST | `/api/leads/:id/calls` | assigned EXEC only (ADMIN → 403) | `{ outcome, durationSeconds, notes?, calledAt?, nextFollowUpAt? }` | `201 { call: Call, followUp: FollowUp \| null }` |
| GET | `/api/calls` | ADMIN: all · EXEC: calls they made | query: `executiveId?` (ADMIN only), `outcome?` | `200 { calls: Call[] }` newest first |

Side effects of POST call (server-side): `executiveId` = JWT user; `calledAt` defaults to now; if `nextFollowUpAt` is given a PENDING follow-up is created; if lead status is `NEW` it becomes `CONTACTED`; if outcome is `CONVERTED` the lead status becomes `CONVERTED`. The response's `followUp` is the created one (or null). Client should refetch the lead after posting.

### Follow-ups
| Method | Path | Who | Body / query | 2xx response |
|---|---|---|---|---|
| GET | `/api/follow-ups` | ADMIN: all · EXEC: own assigned leads | query: `scope` = `today` \| `upcoming` \| `overdue` \| `completed` \| `all` (default `all`), `leadId?` | `200 { followUps: FollowUp[] }` ascending `dueAt` (completed: newest first) |
| POST | `/api/follow-ups` | assigned EXEC only | `{ leadId, dueAt, notes? }` (`dueAt` not before start of today IST) | `201 { followUp: FollowUp }` |
| PATCH | `/api/follow-ups/:id` | assigned EXEC only | `{ action: "complete", notes? }` or `{ action: "reschedule", dueAt, notes? }` | `200 { followUp: FollowUp }` |

Scope rules (only `PENDING` items appear in today/upcoming/overdue):
- **overdue**: `dueAt` < start of today IST
- **today**: start of today ≤ `dueAt` < start of tomorrow IST
- **upcoming**: `dueAt` ≥ start of tomorrow IST

Reschedule keeps history: the old follow-up becomes `RESCHEDULED` and a **new** PENDING one is created and returned. Only PENDING follow-ups can be completed/rescheduled (otherwise `400`).

### Dashboard
`GET /api/dashboard` — any logged in; shape depends on role.

```ts
// ADMIN
{
  role: 'ADMIN',
  totals: { totalLeads, assignedLeads, unassignedLeads, leadsContacted, totalCalls, connectedCalls,
            pendingFollowUps, overdueFollowUps, todayFollowUps, convertedLeads },   // all numbers
  metrics: Metrics,                     // overall, over assigned leads / all calls
  executives: Array<UserRef & { email: string; assignedLeads; leadsContacted; totalCalls; connectedCalls;
                                convertedLeads; pendingFollowUps; overdueFollowUps } & Metrics>
}
// SALES_EXECUTIVE
{
  role: 'SALES_EXECUTIVE',
  totals: { assignedLeads, leadsContacted, totalCalls, connectedCalls,
            pendingFollowUps, overdueFollowUps, todayFollowUps, convertedLeads },
  metrics: Metrics
}
```

`pendingFollowUps` = all PENDING (includes overdue and today).

### Reports (CSV, ADMIN only)
| GET | `/api/reports/leads` · `/api/reports/calls` · `/api/reports/performance` |
|---|---|

Response: `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="leads-YYYY-MM-DD.csv"`. A plain `<a href>` won't send the JWT, so the client must `fetch` with the Authorization header, turn the response into a Blob and trigger the download. EXEC → `403`.

## Business definitions (for display text)
- **Connected outcomes**: CONNECTED, INTERESTED, NOT_INTERESTED, CALL_BACK_REQUESTED, VISIT_SCHEDULED, CONVERTED. (NOT_ANSWERED, BUSY, SWITCHED_OFF = not connected.)
- **Converted lead**: lead.status = CONVERTED.
- **Lead contacted**: lead has ≥1 call by its current assignee (counted once, no matter how many calls).
- Coverage and conversion use the **current** assignee. Connection rate uses whoever **made** the call, so reassigned leads keep their call history with the original caller.
