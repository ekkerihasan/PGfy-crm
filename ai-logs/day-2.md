# Day 2

**No separate Day 2 took place.** The whole build (both the Day 1 and Day 2 scope from the assignment schedule) was finished in one accelerated session on **2026-11-05**. Claude Code (backend) and Codex (frontend) worked in parallel. See `day-1.md` for the full log.

Day-2-scope items, and where they are logged in `day-1.md`:

| Assignment Day 2 item | Done in |
|---|---|
| Call tracking | Backend API routes · Frontend leads screens |
| Follow-up management | Backend API routes · Frontend supporting screens |
| Sales metrics | Backend API routes + tests |
| Excel/CSV exports | Backend reports + sample CSVs |
| Frontend–backend integration | Codex real-backend walkthrough |
| Basic testing | Backend test suite · Codex walkthrough |
| README and AI logs | Documentation entries |

Any finalisation done after the sprint will be added below with its real date and time.

---

### Finalisation: screenshot fix (2026-11-05, after the sprint)
- **Tool:** Claude Code (took over this task from Codex at the developer's request)
- **Task/prompt:** "Do that task instead of Codex": `sales-lead-detail.png` had been captured while the page was still showing "Loading…".
- **Output used:** `client/verification/screenshots.mjs`. The script now waits for the "Customer information" and "Call history" headings before capturing, and opens a seeded lead that has calls (Aarav Sharma for sales, Diya Reddy for admin). All 15 screenshots in `docs/screenshots/` were retaken.
- **Developer changes:** reseeded the demo DB first (`npm run db:seed`), so the screenshots show clean seed data with no walkthrough test leads.
- **Verification:** the script ran with playwright-core + local Chrome: "Browser screenshots finished; no uncaught page errors." Inspected `sales-lead-detail.png` (3 calls, 1 pending follow-up) and `admin-dashboard.png` (24 leads, 42 calls, 85.0% / 15.0% / 73.8%, which matches the seed and the backend tests).
- **Result:** passed
