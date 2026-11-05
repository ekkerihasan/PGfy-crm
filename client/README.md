# PGfy Sales CRM frontend

React + TypeScript, Vite, Tailwind CSS v4 and React Router. Requires Node.js 20.19+ or 22.12+ and the seeded backend on port 4000.

```sh
npm install
npm run dev
npm run build
npm run preview
```

Run commands from `client/`. Development opens on http://localhost:5173. Vite proxies `/api` to http://localhost:4000. For a separately hosted API, copy `.env.example` to `.env` and set `VITE_API_URL` to its origin (for example `http://localhost:4000`, without `/api`). Restart Vite after changing environment variables. The API must permit that frontend origin. Production hosting needs an `/api` reverse proxy or `VITE_API_URL` plus SPA fallback to `index.html`.

Demo sign-in: `admin@pgfy.demo` / `Admin@123`, or `sales@pgfy.demo` / `Sales@123`. Tokens live in localStorage; protected 401 responses clear the session and redirect to login. Server permissions remain authoritative.

- `src/types/api.ts`: frozen API types and enum values.
- `src/lib/`: fetch/download client and display formatting.
- `src/auth/`: session context and sign-in/sign-out.
- `src/components/ui/`: shared controls and states.
- `src/pages/`: login, dashboard, leads and lead detail, follow-ups, calls, reports.
- `src/App.tsx`: protected routes and role-aware workspace layout.

The client uses real API responses only. Dashboard metrics are computed by the server. Dates display using the browser's local timezone and en-IN locale; follow-up scope boundaries are computed by the server in IST. Rescheduling preserves the old follow-up in history and creates a new pending follow-up.

Build and integration results are recorded in `../ai-logs/codex-log.md`; screenshots, when browser verification is available, go in `../docs/screenshots/`.

## Verification (5 November 2026)

All seven screens are implemented: login, dashboard, leads, lead detail, follow-ups, call history and administrator reports. No API contract changes were needed, and no fixtures remain.

`npm run build` passed (TypeScript and Vite, 39 modules). A real-backend browser walkthrough passed with both seeded roles: create and assign a lead, record two calls, complete/reschedule/schedule follow-ups, confirm dashboard changes and download all three CSVs. Screenshots cover every screen, plus mobile login and leads. Browser automation was used for the walkthrough; this was not a separate human manual test. Fictional verification leads and their activity remain in the demo database.

The sandbox blocked npm registry requests. Dependencies were recovered from an existing local installation and pinned, with the corresponding dependency lockfile; a clean registry installation could not be verified in this environment.

Repeat browser verification with Playwright available locally (it is not an application dependency), Chrome installed, and both servers running:

```powershell
# Run from the repository root; set these to your local installation paths.
$env:PLAYWRIGHT_MODULE_PATH = 'C:/path/to/node_modules/playwright'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/path/to/chrome.exe'
$env:CLIENT_URL = 'http://127.0.0.1:5173'
node client/verification/walkthrough.mjs
node client/verification/screenshots.mjs
```

The walkthrough creates fictional demo records and checks live API behavior through the UI. Screenshots are saved to `docs/screenshots/`. Playwright is used only for development verification; the shipped app uses fetch and real API data.
