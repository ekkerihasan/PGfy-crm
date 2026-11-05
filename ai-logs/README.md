# AI usage: PGfy Sales CRM

## Tools used
| Tool | Used for |
|---|---|
| **Claude Code** (Anthropic, Claude Opus model, CLI) | Planning, work split and API contract; the whole backend (Prisma schema, migration, seed, Express API, auth/permissions, metrics, CSV reports); backend test suite; root README; merging the logs; git |
| **Codex** (OpenAI), run as a coordinator with 3 sub-agents | The whole frontend in `client/`: scaffold, typed API client, auth, all 7 screens, a scripted browser walkthrough, screenshots |

## How AI was used
- **One accelerated session, not two days.** The work was done on **2026-11-05**, with Claude Code and Codex running *in parallel*. The assignment allows 2 days. `day-1.md` holds the real log and `day-2.md` says plainly that no separate second day took place.
- **Collisions were avoided by design.** `build.md` gives each tool its own folders: Claude owns `server/` and the root files, Codex owns `client/`, and only Claude runs git. The two sides talked only through a frozen contract, `docs/API_CONTRACT.md`. Codex had a channel for change requests (`docs/CONTRACT_REQUESTS.md`) and never needed it.
- **The developer** chose the stack and approach (Docker Postgres, two tools in parallel), approved the plan, started each tool, and relayed the "backend is live" signal.

## How the output was reviewed and verified
- **Backend:** `tsc --noEmit` passes. **33 automated API tests** (Vitest + Supertest) pass on a separate test database. Dashboard numbers were also checked by hand against the seed data.
- **Frontend:** Codex ran `tsc -b && vite build`, then a Playwright browser walkthrough against the real API covering both roles and the full demo flow, and captured 15 screenshots. This was automated, not a human manual test.
- **Clean install:** Claude ran a clean `npm ci` + build of the frontend separately, because Codex's sandbox had no network access (see `day-1.md`).
- **Honesty rule:** nothing is marked passed unless a command was actually run and its output seen. Known gaps are listed in the root `README.md`.

## Raw logs
- `claude-log.md`: Claude Code's log, written as the work happened
- `codex-log.md`: Codex's log, written as the work happened

`day-1.md` merges both, in time order. No secrets are logged. The only credentials mentioned anywhere are the fictional demo accounts the assignment requires.
