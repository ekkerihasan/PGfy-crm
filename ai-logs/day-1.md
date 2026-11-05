# Day 1: 2026-11-05 (single accelerated session, Claude Code + Codex in parallel)

Times are IST. Codex entries keep the timestamps Codex recorded. Claude entries are ordered by real evidence: the migration folder timestamp, seeded row `createdAt` values and the test run's start time. Full raw logs are in `claude-log.md` and `codex-log.md`.

---

### 1. Analysis, work split and API contract (before ~21:00)
- **Tool:** Claude Code
- **Task/prompt:** "Read the build plan and assessment, analyse it." Then: "Run Claude and Codex in parallel on different features without colliding; let Codex use multiple agents."
- **Output used:** `build.md` (ownership table, parallel timeline), `docs/API_CONTRACT.md` (frozen endpoints, types, errors, metric definitions), `docs/CODEX_PROMPT.md`.
- **Developer changes:** chose Docker for Postgres. Asked for a separate second executive account for ownership tests.
- **Verification:** contract checked line by line against the assignment's roles table, dashboards, call outcomes, follow-up scopes, metrics and reports.
- **Result:** passed

### 2. Frontend requirements and delegation (21:00)
- **Tool:** Codex (coordinator)
- **Task/prompt:** Read the requirements, `build.md` and the contract, then start staged parallel work: Agent 1 builds the foundation, Agents 2 and 3 build pages.
- **Output used:** the agent assignment plan.
- **Developer changes:** none
- **Verification:** files read; no existing client.
- **Result:** passed

### 3. Backend setup: Docker Postgres, Express, Prisma schema (~21:04)
- **Tool:** Claude Code
- **Task/prompt:** Scaffold `server/` (Express 5 + TS via tsx, Prisma 6, zod, bcryptjs, jsonwebtoken). Write `docker-compose.yml` (postgres:16) and a Prisma schema with User/Lead/Call/FollowUp, enums and indexes.
- **Output used:** `docker-compose.yml`, `.gitignore`, `server/package.json`, `server/tsconfig.json`, `server/.env.example`, `server/prisma/schema.prisma`.
- **Developer changes:** none
- **Verification:** `docker compose up -d` started the container. `prisma migrate dev --name init` created `20261105153444_init` with "database is now in sync".
- **Result:** passed

### 4. Frontend foundation (21:03)
- **Tool:** Codex (Agent 1)
- **Task/prompt:** Scaffold the typed API client, contract types and routing so the page agents can work in parallel.
- **Output used:** `client/package.json`, `vite.config.ts`, `src/types/api.ts`, `src/lib/api.ts`, `src/lib/format.ts`, page placeholders.
- **Developer changes:** none
- **Verification:** the coordinator reviewed the types and fetch wrapper.
- **Result:** partial (build still pending at this point)

### 5. Seed data (~21:07)
- **Tool:** Claude Code
- **Task/prompt:** A rerunnable fictional seed with 3 users, 24 Bengaluru leads (12 / 8 / 4 unassigned), 2–3 calls per contacted lead, and today/upcoming/overdue/completed follow-ups dated relative to now.
- **Output used:** `server/prisma/seed.ts`, `server/src/lib/time.ts`.
- **Developer changes:** none
- **Verification:** ran the seed twice. psql after the second run showed `3|24|42|13`, so no duplicates.
- **Result:** passed

### 6. Dashboard, follow-ups, calls and reports screens (21:06)
- **Tool:** Codex (Agent 3)
- **Task/prompt:** Build the dashboard, scoped follow-ups, call history and authenticated CSV downloads.
- **Output used:** `client/src/pages/{dashboard,follow-ups,calls,reports}/*`.
- **Developer changes:** none
- **Verification:** the coordinator reviewed them against the contract.
- **Result:** partial (build pending)

### 7. Backend API: auth, permissions and every endpoint (~21:08–21:15)
- **Tool:** Claude Code
- **Task/prompt:** Implement every endpoint in the contract: JWT login and `/me`, `authenticate` + `requireRole`, an ownership helper (executives get 404 on other people's leads), strict zod bodies, append-only calls, follow-up scopes/complete/reschedule, dashboard metrics and 3 CSV reports.
- **Output used:** `server/src/**`.
- **Developer changes:** fixed one Express 5 typing error.
- **Verification:** `tsc --noEmit` exited 0. Curl smoke tests: bad login 401, no token 401, admin sees 24 leads, sales sees 12, sales calling a report gets 403. Dashboard numbers matched a hand count of the seed (sales: 12/10/25/19/2/7 → 83.3% / 16.7% / 76%).
- **Result:** passed. The developer was told "backend live" so Codex could switch to real data.

### 8. Leads screens (21:10)
- **Tool:** Codex (Agent 2 + coordinator)
- **Task/prompt:** Leads list/detail, create/edit forms, assignment, the add-call form, lead follow-ups and browser verification scripts.
- **Output used:** `client/src/pages/leads/*`, `client/verification/*.mjs`.
- **Developer changes:** none
- **Verification:** reviewed against the contract. The first build attempt failed because dependencies weren't installed yet.
- **Result:** partial

### 9. Frontend dependency recovery (21:11)
- **Tool:** Codex (Agent 1 + coordinator)
- **Task/prompt:** Install dependencies inside a sandbox with no network access.
- **Output used:** `client/node_modules`, built from packages already installed locally; versions pinned in `client/package.json` and the lockfile.
- **Developer changes:** none
- **Verification:** registry access was denied, so Codex reused local packages read-only. The backend responded to `/api/auth/me` (401 without a token, as expected).
- **Result:** partial. Clean install unverified at this point (see entry 14).

### 10. Frontend production build (21:13)
- **Tool:** Codex (Agent 1)
- **Output used:** `client/dist` (39 modules).
- **Verification:** `tsc -b && vite build` passed. The Vite dev server returned 200.
- **Result:** passed

### 11. Backend automated tests (~21:17)
- **Tool:** Claude Code
- **Task/prompt:** A Vitest + Supertest suite for the test matrix, run against a separate `pgfy_crm_test` database.
- **Output used:** `server/vitest.config.ts`, `server/tests/global-setup.ts`, `server/tests/api.test.ts`.
- **Developer changes:** the first setup used `prisma migrate reset`. Prisma refused to run it from an AI agent without the user's consent, so it was replaced with the non-destructive `migrate deploy` + `db seed` on the dedicated test database. The guard was not bypassed.
- **Verification:** `npm test` → **33 passed, 0 failed**. The test database had 4 users and the demo database still had 3, which confirms the tests didn't use demo data.
- **Result:** passed

### 12. Real-backend browser walkthrough (21:18)
- **Tool:** Codex (coordinator), Playwright with the locally installed Chrome
- **Task/prompt:** Run the full demo flow through the real UI and API.
- **Verification:** the script exited 0. It covered: admin creates a lead, assigns it to sales, logs out; sales logs in, logs 2 calls with follow-ups, completes one, reschedules one and schedules another; dashboard totalCalls +2 and leadsContacted +1; every follow-up scope; Reports hidden from sales; admin downloads all 3 CSVs. No page errors. This was automated, not a human manual test.
- **Result:** passed

### 13. Frontend docs and screenshots (21:19)
- **Tool:** Codex
- **Output used:** `client/README.md`, `docs/screenshots/*.png` (15 images).
- **Verification:** build passed again after locking versions. Screenshots were inspected.
- **Result:** passed. *Claude later noticed that `sales-lead-detail.png` was captured while the page was still loading.*

### 14. Docs, sample CSVs and clean-install check (~21:20 onward)
- **Tool:** Claude Code
- **Task/prompt:** Root README (setup, env vars, demo accounts, assumptions, tests, missing items). Sample CSVs. Merged AI logs. Independent clean install of the client.
- **Output used:** `README.md`, `server/scripts/export-samples.ts`, `docs/samples/*.csv`, `ai-logs/README.md`, `day-1.md`, `day-2.md`.
- **Developer changes:** none
- **Verification:** sample CSVs were generated through the real API on a freshly seeded test DB (24 leads, 42 calls, 2 executives + team total). Copied `client/` (without node_modules) to a scratch folder and ran `npm ci` against the public registry: added 44 packages. Then `npm run build` succeeded with the same bundle as Codex's (JS 268.79 kB, CSS 20.94 kB). This resolves the open question from entry 9: a clean install from the lockfile works.
- **Result:** passed
