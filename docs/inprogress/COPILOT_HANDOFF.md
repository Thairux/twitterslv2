# Copilot Handoff — SQMG Models / Downloads / Catalogue / Search

## Session
- Project: `twitterslv2`
- Session ID: `ses_f17a252aaffemPkN90WfPEEFe8`
- Session transcript: OpenCode session store for `ses_f17a252aaffemPkN90WfPEEFe8`; repo-local note at `docs/inprogress/session-2026-09-28-s0.md`
- Status: Loop 1/2 complete, Loop 1/2 findings fixed and closed, Loop 3 regression still deferred

## Documentation alignment

The repository is implemented through Sprint 7; older scaffold-only statements
in root README/HANDOFF and the original master plan have been corrected. The
project-scoped skill registry is `agents/skills-lock.json`, with 15 source
skills under `agents/skills/`. For this gate, load `model-provider`,
`testing-strategy`, and `definition-of-done`; keep the architecture and
invariants rules in force.

## What’s Already Done
- `src/lib/api/hf.ts`
  - `listRepoGgufs()` now builds the HF tree API URL with split owner/repo path segments.
  - `searchRepos()` propagates HTTP/network errors instead of returning `[]`.
- `src/lib/api/models.ts`
  - `listCatalogue()` is async, Zod-validated, deduped against `downloaded_models`, and enriches GGUF siblings via `listRepoGgufs`.
  - Cancelled/errored downloads delete the partial blob and reset progress.
  - Resume uses the stored `filename` from `download_progress`.
  - Catalogue replaced with verified public GGUF repos.
- `src/native/files.ts`
  - Removed dead `fsAppend` helper.
  - Web append uses `memoryStore` to avoid repeated IDB reads.
- `src/pages/ModelsPage.tsx`
  - Catalogue loaded via `useEffect` with state.
  - Search shows a user-visible error on failure.
  - Downloads/progress typing aligned with current DB shape.

## Verified Public GGUF Catalogue
- `Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
- `MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF`
- `QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF`

## Current Verification State
- `npm run check`: clean (2026-10-01)
- `npm test -- --run`: 99 passed (2026-10-01)
- `npm run test:e2e`: 4 passed (2026-10-01)
- `npm run build`: succeeds (2026-10-01)
- `npm run lint`: unavailable; no ESLint dependency/configured executable
- Dev server: confirmed live on port 5173
- Browser: Models page renders, Catalogue tab loads repos, Files button enumerates GGUF files

## SQMG discovery-only pass — 2026-10-01

- Loop 1 critique and Loop 2 browser validation were run.
- Loop 3 regression was intentionally not run per user instruction.
- Reproduced OPEN `BUG-004` (Download pushed outside the card/viewport) and
  `BUG-005` (bottom tab bar crosses the phone shell's right boundary).
- Additional OPEN findings: `BUG-006` through `BUG-009` and `IMP-006` through
  `IMP-008`; see `docs/bugs.md` and `docs/improvements.md`.
- This broader feature walk added `BUG-010` (New DM opens generic Search
  without a recipient flow) and `BUG-011` (quiet-hours inputs lack accessible
  labels).
- No application code was changed.

## Applied fixes — 2026-10-01

- `src/pages/ModelsPage.tsx` — wrapped overflowing select+Download rows,
  added visible Cancel controls for active downloads, and surfaced catalogue
  load errors.
- `src/pages/SearchPage.tsx` — wired Go button to trigger search; added `tab`
  query-param support for the New DM recipient flow.
- `src/pages/DMsPage.tsx` — changed `+ New DM` to open persona search.
- `src/pages/NotificationsPage.tsx` — added accessible labels for quiet-hours
  time inputs.
- `src/styles/themes.css` — centered the fixed tabbar within the phone shell.
- `src/lib/api/models.ts` — fixed catalogue deduplication to use downloaded
  repo names instead of full download IDs.

## Verification after fixes

- `npm run check` — passed.
- `npm test` — 99 passed.
- `npm run build` — passed.
- All Loop 1/2 findings moved to CLOSED in `docs/bugs.md` and
  `docs/improvements.md`.

## What Copilot Should Do Next
1. **Loop 3 regression**
   - Still deferred per original instruction; run only if requested.
2. **Polish if needed**
   - Replace any remaining broken catalogue entries if HF repos change
   - Add small-browser retry/backoff if network flakiness shows up in manual testing

## Constraints
- Stay within the repo’s four-layer architecture.
- Do not add secrets, cloud egress, or external spend without user approval.
- Do not delete user posts without approval.
- Keep SQL migrations additive; do not edit merged schema.

## Quick Commands
```powershell
cd "C:\Users\ptmth\Desktop\main project\twitterslv2"
npm run check
npm test
npm run test:e2e
npm run build
```
