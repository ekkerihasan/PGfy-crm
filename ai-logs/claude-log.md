# Claude Code — backend log (raw, written during work)

Date: 2026-11-05 (single accelerated session; work done in parallel with Codex on the frontend).

### Planning and contract (Claude Code)
- Tool: Claude Code (Opus)
- Task/prompt: "Analyse build.md + assignment, split work with Codex so we don't collide." Produced `build.md` (ownership table, parallel timeline), `docs/API_CONTRACT.md` (frozen API contract), `docs/CODEX_PROMPT.md`.
- Output used: all three files.
- Developer changes: chose Docker for Postgres.
- Verification: compared contract against every requirement in `PGfy_Sales_CRM_Assignment.md` (roles table, dashboards, call outcomes, follow-up scopes, 3 metrics, 3 reports).
- Status: passed

### Project setup: Postgres, Express, Prisma schema
- Tool: Claude Code
- Task/prompt: Scaffold `server/` (Express 5 + TypeScript via tsx, Prisma 6, zod, bcryptjs, jsonwebtoken), `docker-compose.yml` with postgres:16-alpine, write Prisma schema with 4 models + enums + indexes.
- Output used: `docker-compose.yml`, `.gitignore`, `server/package.json`, `server/tsconfig.json`, `server/.env.example`, `server/prisma/schema.prisma`.
- Developer changes: none.
- Verification: `docker compose up -d` → container started; `npx prisma migrate dev --name init` → migration `20261105153444_init` created, "database is now in sync".
- Status: passed

### Seed data
- Tool: Claude Code
- Task/prompt: Rerunnable fictional seed: 3 users (admin, sales, sales2), 24 Bengaluru leads (12/8/4 unassigned), call history per contacted lead, today/upcoming/overdue/completed follow-ups relative to "now".
- Output used: `server/prisma/seed.ts`, `server/src/lib/time.ts` (IST day boundaries).
- Developer changes: none.
- Verification: ran `npx prisma db seed` twice, then counted rows with psql after the second run → `3|24|42|13` (users|leads|calls|follow-ups) = exactly one seed's worth, so no duplicates.
- Status: passed

### Auth, permissions and all API routes
- Tool: Claude Code
- Task/prompt: Implement every endpoint in docs/API_CONTRACT.md: JWT login/me, authenticate + requireRole middleware, ownership helper (exec gets 404 on others' leads), strict zod bodies (no mass assignment), append-only calls, follow-up scopes/complete/reschedule, dashboard metrics, 3 CSV reports.
- Output used: `server/src/**` (app.ts, middleware/auth.ts, lib/{http,shapes,metrics,csv,time}.ts, routes/*.ts).
- Developer changes: fixed one Express 5 typing error (`req.params.id` → `String(...)`).
- Verification: `npx tsc --noEmit` → exit 0. Curl smoke test: bad login 401, no token 401, admin sees 24 leads, sales sees 12, sales GET /reports/leads 403. Dashboard numbers checked by hand against the seed (sales: 12 assigned, 10 contacted, 25 calls, 19 connected, 2 converted, 7 pending; coverage 83.3%, conversion 16.7%, connection 76%).
- Status: passed

### Automated backend tests
- Tool: Claude Code
- Task/prompt: Vitest + Supertest suite covering the build-plan test matrix, run against a separate `pgfy_crm_test` database.
- Output used: `server/vitest.config.ts`, `server/tests/global-setup.ts`, `server/tests/api.test.ts` (33 tests).
- Developer changes: first global setup used `prisma migrate reset`; Prisma refused to run it from an AI agent without user consent. Switched to the non-destructive `prisma migrate deploy` + `prisma db seed` on the dedicated test DB instead of bypassing the guard.
- Verification: `npm test` → 1 file, **33 passed** (seed metrics, zero denominators, login ok/bad, missing/invalid token, executive 403s, admin can't record calls, ownership 404s incl. guessed IDs and unassigned leads, executive status-only edits, mass-assignment rejection, assign/reassign, append-only call history, follow-up scope split, complete/reschedule, CSV escaping + report rows/columns, no password hashes in CSV). Confirmed the demo DB was not used: test DB has 4 users (incl. test-only "Empty Exec"), demo DB still 3.
- Status: passed
