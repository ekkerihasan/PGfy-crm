You are the FRONTEND engineer on the PGfy Sales CRM interview assessment. Another agent (Claude Code) is building the backend in parallel in the same folder. You must not collide with it.

Read these first, in order:
1. `PGfy_Sales_CRM_Assignment.md` (requirements)
2. `build.md` (parallel plan + ownership table, sections 1, 3, 5, 7)
3. `docs/API_CONTRACT.md` (FROZEN API contract: build exactly to it)

## Hard boundaries
- Only create or edit files inside `client/`, plus `ai-logs/codex-log.md`, `docs/screenshots/**` and `docs/CONTRACT_REQUESTS.md`.
- Never touch `server/`, root files (`README.md`, `.gitignore`, `build.md`, `docker-compose.yml`), `docs/API_CONTRACT.md`, or other `ai-logs/*` files.
- Never run any `git` command. Claude handles git.
- Do not invent endpoints or fields. If you need an API change, append it to `docs/CONTRACT_REQUESTS.md` (what, why, which screen) and work around it.
- Install npm packages only in `client/`.

## Stack and setup
- Vite + React + TypeScript + Tailwind CSS (v4 with `@tailwindcss/vite`), React Router. Keep dependencies minimal: no UI kits, chart libraries, animation libraries or state-management libraries. Use fetch, not axios.
- `client/vite.config.ts`: dev server on port 5173, proxy `/api` → `http://localhost:4000`. Optional `VITE_API_URL` (document it in `client/.env.example`).
- Put contract types in `client/src/types/api.ts`, copied exactly from the contract.
- `client/src/lib/api.ts`: a fetch wrapper that adds `Authorization: Bearer <token>`, parses `{ error, details }`, and logs out and redirects to `/login` on any 401. Store the token in localStorage.
- Auth context with `user`, `login`, `logout`. Protected routes. Role-aware navigation: Reports appears only for ADMIN.

## Screens (minimal, neutral and readable UI: sidebar + header, tables, compact forms, desktop first and usable on mobile)
1. `/login`: email/password, clear error message, small "Demo: admin@pgfy.demo / Admin@123 · sales@pgfy.demo / Sales@123" hint.
2. `/`: Dashboard. Cards for every number in `totals`, 3 metric cards shown as %, and for ADMIN a per-executive performance table (all fields).
3. `/leads`: table, search box, status filter. ADMIN also gets an assignee filter (including "Unassigned"), a "New lead" form, edit and assign/reassign (dropdown from `/api/users/executives`). Budget formatted as ₹ with `en-IN`. Show the assigned executive's name or "Unassigned".
4. `/leads/:id`: customer info. Status select (ADMIN edits all fields; EXEC changes only status). Call history, newest first. Add-call form (EXEC only): outcome, duration (minutes + seconds → `durationSeconds`), notes, optional next follow-up datetime. Follow-ups for this lead with complete/reschedule, plus "Schedule follow-up" (EXEC only). Refetch the lead, calls and follow-ups after each mutation.
5. `/follow-ups`: tabs Today / Upcoming / Overdue / Completed (`scope` query). Columns: customer (link to lead), mobile, executive, due, notes. Complete and reschedule actions for EXEC; ADMIN gets read-only monitoring.
6. `/calls`: ADMIN sees all calls (filters: executive, outcome); EXEC sees "My calls".
7. `/reports`: ADMIN only. 3 buttons (Leads, Call history, Executive performance). Fetch with the JWT, turn the response into a Blob and download it as a file.

Shared components: Button, Input, Select, Table, Card, Modal (or inline form), Badge for statuses/outcomes, a loading state and an error/empty state. Display labels: replace `_` with a space and title-case the result. Dates use `en-IN` locale formatting.

## Use multiple agents (parallel sub-agents) for speed, with disjoint files
- **Agent 1, foundation (run first, about 15 min, then the others start):** scaffold, Tailwind, vite proxy, `types/api.ts`, `lib/api.ts`, `lib/format.ts`, auth context, router, layout/sidebar, `components/ui/*`, Login page. Others must not edit these files; if they need a shared helper, they ask Agent 1 or add it in their own folder.
- **Agent 2, leads:** `src/pages/leads/*` (list, form, assign, detail including the call form and lead follow-ups).
- **Agent 3, the rest:** `src/pages/dashboard/*`, `src/pages/follow-ups/*`, `src/pages/calls/*`, `src/pages/reports/*`.
- Only Agent 1 edits `App.tsx`/router. Register routes for all pages up front with placeholder components so Agents 2 and 3 just fill in their files.

## Backend availability
The backend will come online around minute 45 at `http://localhost:4000`; the developer will tell you when. Until then, build against the contract types, and if needed use a tiny local fixture to look at layouts. **Remove all fixtures before you finish.** The final app must use real API data only. Once the backend is live, run `npm run dev` in `client/`, log in as admin and as sales, and test every screen.

## Quality gates (run them and report the actual results; never claim a check you did not run)
- `npm run build` in `client/` passes (tsc + vite build) with no type errors.
- Manual walk-through against the real backend: admin login → create lead → assign to sales → logout → sales login → open lead → log 2 calls with a next follow-up → complete one follow-up and reschedule another → dashboard numbers change → admin downloads all 3 CSVs.
- Screenshots of each screen saved to `docs/screenshots/` (if your environment can take them; otherwise say so).

## Logging (mandatory, factual, written as you go)
Append to `ai-logs/codex-log.md` after each milestone:
```
### <milestone>: <actual time>
- Tool: Codex (<agent 1/2/3>)
- Task/prompt: <short summary>
- Output used: <files>
- Developer changes: <what was changed or 'none'>
- Verification: <commands run + actual results>
- Status: passed / failed / partial
```
No secrets in the logs. Also write a short `client/README.md` covering env vars, run commands, and the folder layout.

Begin now. Do not stop to ask about styling. When done, report: the screens finished, anything missing, any contract requests, and the results of the build and walk-through.
