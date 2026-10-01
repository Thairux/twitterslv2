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

## Discovery-only SQMG pass — 2026-10-01

- Loop 1 critique and Loop 2 browser validation completed.
- Loop 3 regression intentionally skipped.
- No source code changed.
- New findings are OPEN in `docs/improvements.md` (`IMP-006`–`IMP-008`) and
  `docs/bugs.md` (`BUG-004`–`BUG-011`).
- The two reported layout defects were reproduced with browser measurements.
- Additional feature exploration found the New DM navigation gap and
  unlabeled quiet-hours controls.

## Handoff

- `docs/inprogress/COPILOT_HANDOFF.md` updated with current state, next steps,
  and session ID `ses_f17a252aaffemPkN90WfPEEFe8`.
