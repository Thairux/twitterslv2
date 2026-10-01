# Current Sprint — Sprint 7 verification

## Scope

Models, endpoint configuration, Hugging Face catalogue/search, GGUF file
enumeration, downloads, progress, cancellation, resume, and cleanup.

## State

- Implementation: complete for the current handoff.
- Automated checks: last handoff reported `npm run check`, `npm test`,
  `npm run test:e2e`, and `npm run build` green.
- Automated verification on 2026-10-01 confirmed: typecheck passed, 99
  Vitest tests passed, 4 Playwright tests passed, and the production build
  passed.
- Manual gate: pending browser verification of all four catalogue repositories,
  file lists, a small download, cancellation/resume behavior, and Downloads
  deletion.

## Latest fixes — 2026-10-01

- `src/lib/api/hf.ts`: fixed `listRepoGgufs()` repo URL encoding that was
  causing 400/401 errors; `searchRepos()` now propagates errors.
- `src/lib/api/models.ts`: replaced placeholder catalogue with verified public
  GGUF repos; `listCatalogue()` is async, Zod-validated, deduped, and enriches
  GGUF siblings; cancel/error now deletes partial blobs; resume uses stored
  filename.
- `src/native/files.ts`: removed unused `fsAppend`; web append uses
  `memoryStore` to avoid repeated IndexedDB reads.
- `src/pages/ModelsPage.tsx`: async catalogue loading, search error UI,
  downloads/progress typing aligned with DB shape.

## Verified catalogue repos

- `Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
- `MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF`
- `QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF`

## Required close evidence

1. Complete the manual browser pass from
   `docs/inprogress/COPILOT_HANDOFF.md`.
2. Re-run check, unit/integration tests, E2E, and build.
3. Add `docs/sprint-history/sprint-07.md` with dated results.
4. Update `docs/inprogress/COPILOT_HANDOFF.md` and root `HANDOFF.md`.

## Sprint status: NOT COMPLETE

One definition-of-done gate remains open: manual browser verification of the
models catalogue/download flow. Automated gates are green.
