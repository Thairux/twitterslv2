# Sprint 7 — Models, endpoint, and settings verification

## Verification — 2026-10-01

- `npm run check` — passed.
- `npm test -- --run` — passed: 3 files, 99 tests.
- `npm run test:e2e` — passed: 4 Playwright tests.
- `npm run build` — passed: Vite production bundle generated.
- Manual catalogue/download pass — still pending from the active handoff.
- `npm run lint` — not available: the repository has no ESLint dependency or
  script implementation beyond the package script.

## Scope status

The models, endpoint, HF catalogue/search, GGUF file enumeration, download
progress, cancellation/resume, and Downloads cleanup implementation is present.
Sprint 7 remains open only until the manual browser pass is completed and
recorded; automated verification is green.

## SQMG fixes applied — 2026-10-01

- `src/lib/api/hf.ts` — fixed `listRepoGgufs()` repo URL encoding; `searchRepos()` now propagates errors.
- `src/lib/api/models.ts` — `listCatalogue()` is async, Zod-validated, deduped, and enriches GGUF siblings; replaced placeholder catalogue with verified public GGUF repos; cancel/error now deletes partial blobs; resume uses stored filename.
- `src/native/files.ts` — removed unused `fsAppend`; web append uses `memoryStore` to avoid repeated IDB reads.
- `src/pages/ModelsPage.tsx` — async catalogue loading, search error UI, downloads/progress typing aligned with DB shape.

## Verified catalogue repos

- `Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
- `MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF`
- `QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF`

## SQMG fixes applied — 2026-10-01

- `src/pages/ModelsPage.tsx` — wrapped overflowing file selector/button rows,
  added visible Cancel control for active downloads, and surfaced catalogue
  load errors.
- `src/pages/SearchPage.tsx` — wired Go button to trigger search and added
  `tab` query-param support for New DM recipient flow.
- `src/pages/DMsPage.tsx` — changed `+ New DM` to open persona search.
- `src/pages/NotificationsPage.tsx` — added accessible labels for quiet-hours
  time inputs.
- `src/styles/themes.css` — centered the fixed tabbar within the phone shell.
- `src/lib/api/models.ts` — fixed catalogue deduplication to compare against
  downloaded repo names, not full download ids.

## SQMG verification after fixes — 2026-10-01

- `npm run check` — passed.
- `npm test` — passed: 3 files, 99 tests.
- `npm run build` — passed.
- All Loop 1/2 findings moved to CLOSED in `docs/improvements.md` and
  `docs/bugs.md`.

## Handoff

- `docs/inprogress/COPILOT_HANDOFF.md` updated with current state, next steps,
  and session ID `ses_f17a252aaffemPkN90WfPEEFe8`.
