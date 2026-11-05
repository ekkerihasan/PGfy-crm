# PGfy Sales CRM — Parallel Build Plan (Claude Code + Codex)

> **Source of truth:** `PGfy_Sales_CRM_Assignment.md`. **Interface between agents:** `docs/API_CONTRACT.md` (frozen).
> Supersedes `build (2).md`. Target: working end-to-end MVP in ~120 minutes of parallel work. Never claim unfinished features are complete.

## 1. Who owns what (no overlap)

| Area | Owner | May touch | Must NOT touch |
|---|---|---|---|
| Backend API, Prisma schema, migrations, seed, server tests | **Claude Code** | `server/**`, `docker-compose.yml` | `client/**` |
| Root docs, git, contract, sample CSVs, final AI logs | **Claude Code** | `README.md`, `.gitignore`, `build.md`, `docs/API_CONTRACT.md`, `docs/samples/**`, `ai-logs/README.md`, `ai-logs/day-1.md`, `ai-logs/day-2.md`, `ai-logs/claude-log.md` | `client/**` |
| Frontend app (all screens) | **Codex** | `client/**` (incl. `client/.env.example`, `client/README.md`) | `server/**`, root files, `docs/API_CONTRACT.md` |
| Frontend AI log, screenshots, contract requests | **Codex** | `ai-logs/codex-log.md`, `docs/screenshots/**`, `docs/CONTRACT_REQUESTS.md` | other `ai-logs/*` files |

Rules for both:
- **Git:** only Claude runs `git` commands (init, add, commit). Codex never runs git.
- **Contract is frozen.** Frontend builds exactly to `docs/API_CONTRACT.md`. Need a change? Codex appends to `docs/CONTRACT_REQUESTS.md`; the developer relays it to Claude. Neither side invents endpoints or fields.
- **Ports:** server `4000`, client `5173` (Vite proxy `/api` → `http://localhost:4000`). Postgres `5432` via Docker.
- **Dependencies:** each side installs only in its own folder (`server/package.json`, `client/package.json`). No root workspace.
- **Logs:** each agent logs its own work as it happens (`ai-logs/claude-log.md`, `ai-logs/codex-log.md`). At the end Claude merges both into `day-1.md` / `day-2.md` with real dates (single accelerated session, stated honestly).

## 2. Mandatory stack
React + TypeScript + Tailwind CSS (Vite) · Node.js + Express (TypeScript via `tsx`) · PostgreSQL 16 (Docker) · Prisma · JWT + bcrypt · CSV export. Two roles only: `ADMIN`, `SALES_EXECUTIVE`. Permissions enforced on the server, including record ownership.

## 3. Parallel timeline

| Min | Claude Code — backend (`server/`) | Codex — frontend (`client/`) |
|---|---|---|
| 0–15 | Docker Postgres, Express + Prisma scaffold, schema | Vite + React + TS + Tailwind scaffold, proxy, router, API client, auth context, layout, shared UI |
| 15–30 | Migration + seed (3 users, 24 leads, calls, follow-ups) | Login page; Leads list/filter/search (to contract) |
| 30–45 | Auth (login/me), JWT + role/ownership middleware | Lead create/edit/assign forms; Lead detail skeleton |
| 45–65 | Leads, users, assign endpoints | Lead detail: call history, add-call form, status update, follow-up actions |
| 65–85 | Calls, follow-ups (scopes, complete, reschedule) | Follow-ups page (today/upcoming/overdue), Calls page |
| 85–100 | Dashboard metrics, 3 CSV reports, Vitest + Supertest suite | Dashboards (admin + exec), Reports page (blob download) |
| 100–112 | Fix contract mismatches, run full test suite | Integration against real API, fix bugs, screenshots |
| 112–120 | README, `.env.example`, sample CSVs, merge AI logs, commit | Final `codex-log.md`, `client/README.md` notes |

**The backend is usable from ~minute 45** (auth + leads). Until then Codex builds UI against the contract types without real data. **No mock data may remain in the finished flow.**

**Fallback:** keep the core flow (login → assign → call → follow-up → dashboard → export) working; list gaps honestly in README. Never drop backend role checks.

## 4. Backend spec (Claude)

**Data model**
- `User`: id, name, email unique, passwordHash, role.
- `Lead`: id, customerName, mobile, email?, propertyCategory, preferredLocation, budget (Int, INR), leadSource, status, enquiryDate, assignedToId?, timestamps. Indexes: assignedToId, status.
- `Call`: id, leadId, executiveId, calledAt, durationSeconds, outcome, notes?, nextFollowUpAt?, createdAt. Append-only. Indexes: leadId, executiveId.
- `FollowUp`: id, leadId, executiveId, dueAt, status (PENDING/COMPLETED/RESCHEDULED), notes?, completedAt?, timestamps. Indexes: (status, dueAt), leadId.

**Security:** zod validation with strict bodies (no mass assignment), bcrypt, JWT secret from env, never return passwordHash, 400/401/403/404 errors per contract, executives get 404 on leads not assigned to them.

**Seed (rerunnable — wipes and recreates demo data):** admin, `sales@pgfy.demo`, `sales2@pgfy.demo`; 24 fictional leads across Bengaluru areas, mixed categories/statuses/sources, some unassigned; 2–4 calls per contacted lead; pending (today/upcoming) and overdue follow-ups.

**Tests (Vitest + Supertest, against the seeded DB):** login ok/bad; missing/invalid token → 401; exec cannot create/assign leads or download reports → 403; exec cannot read sales2's lead → 404; reassign updates exec list; multiple calls stay in history; follow-up scope split; metrics zero-denominator; CSV headers + escaping.

## 5. Frontend spec (Codex)

Screens (minimal neutral UI, desktop first, usable on mobile; no chart libs, no animations):
1. **Login** — email/password, error message, show demo credentials hint.
2. **Dashboard** — role-specific cards for every number in `totals`, 3 metric cards (%), admin per-executive table.
3. **Leads** — table (name, mobile, category, location, budget ₹ en-IN, source, status, assigned exec, enquiry date), search, status filter, admin: assignee filter, create/edit modal or page, assign/reassign dropdown.
4. **Lead detail** — customer info, status change, call history (newest first), add-call form (exec only), follow-ups for the lead with complete/reschedule (exec only), schedule follow-up.
5. **Follow-ups** — tabs today / upcoming / overdue / completed; complete + reschedule actions (exec).
6. **Calls** — all calls (admin, filter by executive/outcome) or my calls (exec).
7. **Reports** — admin only, 3 download buttons (fetch with JWT → Blob).

Role-aware UI hides actions the user can't perform, **but the server is the real guard**. Handle 401 → logout; show 403/404/400 messages.

## 6. Analytics (exact formulas — server computes, client only displays)
- Call Coverage Rate = unique assigned leads contacted ÷ total assigned leads × 100
- Conversion Rate = converted leads ÷ total assigned leads × 100
- Connection Rate = connected calls ÷ total calls × 100
- 0 when denominator is 0; a lead counts once no matter how many calls. Definitions in `docs/API_CONTRACT.md`.

## 7. Integration checkpoints (developer runs these)
1. **~min 45:** Claude reports `server` is up + seeded → tell Codex "backend live on :4000". Codex switches to real data.
2. **~min 100:** both stop adding features. Developer walks the demo: admin login → create lead → assign to sales → logout → sales login → open lead → log 2 calls with follow-up → complete/reschedule follow-up → dashboard → admin downloads 3 CSVs.
3. Mismatches go to `docs/CONTRACT_REQUESTS.md`; Claude fixes the server or the contract.

## 8. Submission checklist
Source, Prisma schema + migrations, seed + demo credentials, README (prereqs, env vars, migrate/seed, start commands, demo logins, assumptions, missing features, test results), `.env.example` files, screenshots, sample CSVs in `docs/samples/`, `ai-logs/` (README, day-1, day-2), GitHub URL.

## 9. Interview checkpoints
JWT flow · role + ownership authorization (UI hiding is not security) · Prisma schema/migrations · one-to-many append-only calls · follow-up scopes · analytics numerators/denominators · CSV generation · how AI was used and verified.
