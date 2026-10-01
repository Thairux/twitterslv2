# Copilot Handoff — SQMG Models / Downloads / Catalogue / Search

## Session
- Project: `twitterslv2`
- Session ID: `ses_f17a252aaffemPkN90WfPEEFe8`
- Session transcript: OpenCode session store for `ses_f17a252aaffemPkN90WfPEEFe8`; repo-local note at `docs/inprogress/session-2026-09-28-s0.md`
- Status: Loop 1 complete, Loop 2 automated verification green, one manual Loop 2 item remains

## Goal
Finish Loop 2/3 for the models/downloads/catalogue/search SQMG gate and close
the remaining manual verification for the Models page.

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

## What Copilot Should Do Next
1. **Resolve or triage the new OPEN findings**
   - `BUG-004` / `IMP-006`: responsive selector and Download overflow
   - `BUG-005` / `IMP-007`: bottom tab shell alignment
   - `BUG-006`–`BUG-009` / `IMP-008`: action and state-handling gaps

2. **Loop 3 regression**
   - Deferred; do not run until the discovery findings are triaged.

3. **Polish if needed**
   - Replace any remaining broken catalogue entries if HF repos change
   - Add small-browser retry/backoff if network flakiness shows up in manual testing
   - Update `releases/sqmg-models-1.0.0/sqmg-report.md` with final Loop 2/3 outcomes

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
