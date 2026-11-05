# PGfy Sales CRM & Call Tracking

A small internal CRM where an **Admin** manages and assigns leads and monitors performance, and **Sales Executives** call their assigned leads, record outcomes and notes, update lead status and schedule follow-ups.

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS (Vite): `client/` |
| Backend | Node.js + Express 5 (TypeScript, run with `tsx`): `server/` |
| Database / ORM | PostgreSQL 16 (Docker) + Prisma 6 |
| Auth | JWT (8h) + bcrypt password hashes |
| Reports | CSV export (opens in Excel) |
| Tests | Vitest + Supertest (backend API) |

## Prerequisites
- Node.js 20.12+ (developed on Node 22)
- Docker Desktop (for PostgreSQL), or any local PostgreSQL 14+

## Setup and run

```bash
# 1. Database
docker compose up -d                 # Postgres 16 on localhost:5432 (user pgfy / db pgfy_crm)

# 2. Backend
cd server
cp .env.example .env                 # then set JWT_SECRET to a long random string
npm install
npx prisma migrate deploy            # creates the tables (or: npm run db:migrate in development)
npm run db:seed                      # demo users + fictional data (safe to rerun: wipes and recreates)
npm run dev                          # API on http://localhost:4000

# 3. Frontend (new terminal)
cd client
cp .env.example .env                 # optional, see below
npm install
npm run dev                          # app on http://localhost:5173
```

Open http://localhost:5173 and log in with a demo account.

### Environment variables

| File | Variable | Purpose |
|---|---|---|
| `server/.env` | `DATABASE_URL` | Postgres connection string (default matches `docker-compose.yml`) |
| | `JWT_SECRET` | Secret used to sign tokens. Required; never commit it |
| | `PORT` | API port (default 4000) |
| | `CORS_ORIGIN` | Allowed frontend origin (default `http://localhost:5173`) |
| `client/.env` | `VITE_API_URL` | Optional API base URL. By default the Vite dev server proxies `/api` to `http://localhost:4000` |

Only the `.env.example` files are committed. `.env` is git-ignored.

## Demo accounts

These accounts are fictional and public on purpose, for this assessment only.

| Role | Email | Password |
|---|---|---|
| Admin | admin@pgfy.demo | Admin@123 |
| Sales Executive | sales@pgfy.demo | Sales@123 |
| Sales Executive (2nd) | sales2@pgfy.demo | Sales@123 |

The second executive is extra. It shows that executives are isolated from each other's leads.

**Seed contents:** 24 fictional leads across Bengaluru areas (12 for `sales`, 8 for `sales2`, 4 unassigned). They mix PG / co-living / hostel / apartment / studio and every status. Customer names are fictional Indian names, mobiles use the 10-digit `[6-9]XXXXXXXXX` format, and emails are `@example.com`. There are 42 calls (2–3 per contacted lead). Follow-ups are dated relative to *now*, so today / upcoming / overdue items always exist at demo time.

## Tests

```bash
cd server
npm test        # 33 API tests against a separate pgfy_crm_test database (auto-created; demo data untouched)
npm run typecheck
```

What the tests cover: correct/incorrect login, missing/invalid token (401), executive blocked from creating, assigning, listing executives and all 3 reports (403), admin blocked from recording calls/follow-ups (403), executive gets 404 on another executive's or an unassigned lead (including guessed IDs), executive can change only `status`, mass-assignment rejection, assign/reassign updating the lists, append-only call history in chronological order, follow-up scope split (today/upcoming/overdue are disjoint and PENDING-only), complete/reschedule rules, metrics checked against hand-counted seed numbers, zero denominators, CSV escaping/formula-injection guard, CSV row counts and columns, and no password hashes in exports.

Latest result: **33 passed, 0 failed** (`npm test`, 2026-11-05).

## Features

**Admin:** dashboard (total/assigned/unassigned leads, total/connected calls, pending/overdue follow-ups, converted leads, 3 metrics, per-executive performance table), create/edit leads, search and status/assignee filters, assign and reassign, view all call records, monitor all follow-ups, download 3 CSV reports.

**Sales Executive:** dashboard (my assigned leads, leads contacted, total calls, pending/overdue follow-ups, converted leads, 3 metrics), only their assigned leads, customer details, record calls (outcome, duration, notes, optional next follow-up), update lead status, schedule/complete/reschedule follow-ups, view their own call history.

### API
The full contract (request/response shapes, errors, enums) is in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). Summary:

| Endpoint | Access |
|---|---|
| `POST /api/auth/login`, `GET /api/auth/me` | public / logged in |
| `GET /api/users/executives` | admin |
| `GET /api/leads`, `GET /api/leads/:id` | admin: all · exec: own |
| `POST /api/leads`, `PATCH /api/leads/:id/assign` | admin |
| `PATCH /api/leads/:id` | admin: all fields · exec: `status` only, own lead |
| `GET/POST /api/leads/:id/calls`, `GET /api/calls` | read: admin or owner · create: assigned exec |
| `GET/POST /api/follow-ups`, `PATCH /api/follow-ups/:id` | read: admin or owner · write: assigned exec |
| `GET /api/dashboard` | role-specific |
| `GET /api/reports/leads`, `/calls`, `/performance` | admin (CSV) |

### Security
- Permissions are checked on the server for every route. Hiding buttons in the UI is only a convenience.
- Ownership: every lead-scoped route goes through `getAccessibleLead()` (`server/src/lib/shapes.ts`). An executive gets **404** for leads not assigned to them, so the server doesn't reveal which IDs exist.
- Request bodies are validated with strict zod schemas. Unknown fields are rejected (no mass assignment), and an executive's lead edit accepts only `{ status }`.
- `executiveId` on calls and follow-ups always comes from the JWT, never from the request body.
- Passwords are stored as bcrypt hashes and never returned. The JWT secret comes from the environment. All queries go through Prisma, so they are parameterized.
- CSV cells are RFC-4180 escaped and guarded against spreadsheet formula injection.

## Analytics: definitions and assumptions

| Metric | Formula (from the assignment) |
|---|---|
| Call Coverage Rate | unique assigned leads contacted ÷ total assigned leads × 100 |
| Conversion Rate | converted leads ÷ total assigned leads × 100 |
| Connection Rate | connected calls ÷ total calls × 100 |

The assignment doesn't define these points, so these are my assumptions:
- **Connected call** = outcome is one of Connected, Interested, Not Interested, Call Back Requested, Visit Scheduled or Converted (the customer actually spoke). Not Answered, Busy and Switched Off are not connected.
- **Converted lead** = lead status is `CONVERTED`.
- **Lead contacted** = an assigned lead with at least one call by its current executive. It counts once, however many calls it has.
- **Rates** are rounded to 1 decimal and are **0 when the denominator is 0**.
- **Reassignment:** lead-based numbers (assigned, contacted, converted, follow-ups) follow the **current** assignee. Call-based numbers (total/connected calls, connection rate) stay with the executive who **made** the call, so history is never rewritten. On reassignment, pending follow-ups move to the new executive.
- **Admin overall** metrics use all assigned leads and all calls.

## Other assumptions and behaviour
- **"Today" uses IST (Asia/Kolkata).** Overdue = pending and due before today; Today = pending and due today; Upcoming = pending and due tomorrow or later.
- **Rescheduling keeps history.** The old follow-up is marked `RESCHEDULED` and a new `PENDING` one is created. Only pending follow-ups can be completed or rescheduled.
- **Calls are append-only.** No API updates or deletes a call.
- **Recording a call** can set `nextFollowUpAt`, which also creates a pending follow-up. A lead's first call moves it from `NEW` to `CONTACTED`, and a `CONVERTED` outcome sets the lead to `CONVERTED`.
- **Roles:** only executives record calls and manage follow-ups. The admin monitors them (read-only), as in the assignment's roles table.
- **Budget** is stored as whole INR per month.
- **Lead statuses:** NEW, CONTACTED, INTERESTED, VISIT_SCHEDULED, CONVERTED, LOST.
- **No self-registration or user management screens.** Users come from the seed, since the assignment doesn't ask for user management.

## Project structure

```
docker-compose.yml          Postgres 16
server/
  prisma/schema.prisma      User, Lead, Call, FollowUp + enums + indexes
  prisma/migrations/        SQL migrations
  prisma/seed.ts            fictional demo data
  src/app.ts                Express app + route wiring
  src/middleware/auth.ts    JWT verify, requireRole
  src/lib/                  ownership helper, metrics, CSV, IST time helpers, errors
  src/routes/               auth, users, leads, calls, follow-ups, dashboard, reports
  tests/api.test.ts         API test suite
client/                     React app (see client/README.md)
docs/API_CONTRACT.md        API contract shared by frontend and backend
docs/samples/               sample CSV exports
docs/screenshots/           screenshots
ai-logs/                    AI usage logs (required)
```

## Submission items
- Prisma schema and migrations: `server/prisma/`
- Seed script: `server/prisma/seed.ts`
- Sample CSV exports: `docs/samples/`
- Screenshots: `docs/screenshots/`
- AI logs: `ai-logs/`

Frontend checks: `npm run build` passes. A clean `npm ci` + build from the committed lockfile was verified separately. An automated Playwright walkthrough of the full demo flow passed against the real API (see `client/README.md`).

## Missing / not done
- No live deployment (optional in the assignment).
- No user-management UI (users are seeded).
- No automated frontend unit tests. The UI was verified by an automated browser walkthrough plus screenshots, not by a separate human manual test.
- No pagination on lists. Fine at demo scale; it would be needed for thousands of leads.
- Lead deletion is not implemented (not required). Calls are append-only by design.
