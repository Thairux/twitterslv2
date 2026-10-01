# Current Sprint — Sprint 7 verification

## Scope

Models, endpoint configuration, Hugging Face catalogue/search, GGUF file
enumeration, downloads, progress, cancellation, resume, and cleanup.

## State

- Implementation: complete.
- Automated checks: `npm run check`, `npm test`, `npm run test:e2e`, and
  `npm run build` are green.
- Automated verification on 2026-10-01 confirmed: typecheck passed, 99
  Vitest tests passed, 4 Playwright tests passed, and the production build
  passed.
- Manual browser verification completed during SQMG Loop 2 validation.

## Latest fixes — 2026-10-01

- `src/lib/api/hf.ts`: fixed `listRepoGgufs()` repo URL encoding that was
  causing 400/401 errors; `searchRepos()` now propagates errors.
- `src/lib/api/models.ts`: replaced placeholder catalogue with verified public
  GGUF repos; `listCatalogue()` is async, Zod-validated, deduped, and enriches
  GGUF siblings; cancel/error now deletes partial blobs; resume uses stored
  filename; fixed catalogue deduplication to use repo names.
- `src/native/files.ts`: removed unused `fsAppend`; web append uses
  `memoryStore` to avoid repeated IndexedDB reads.
- `src/pages/ModelsPage.tsx`: async catalogue loading, search error UI,
  downloads/progress typing aligned with DB shape; responsive file rows, visible
  Cancel controls, and cancelled progress rendering.
- `src/pages/SearchPage.tsx`: wired Go button to trigger search; added `tab`
  query-param support for recipient flow.
- `src/pages/DMsPage.tsx`: changed `+ New DM` to open persona search.
- `src/pages/NotificationsPage.tsx`: added accessible labels for quiet-hours
  time inputs.
- `src/styles/themes.css`: centered the fixed tabbar within the phone shell.

## Verified catalogue repos

- `Qwen/Qwen2.5-0.5B-Instruct-GGUF`
- `TheBloke/Mistral-7B-Instruct-v0.2-GGUF`
- `MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF`
- `QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF`

## Close evidence

1. Manual browser pass completed in SQMG Loop 2.
2. Re-run check, unit/integration tests, E2E, and build.
3. `docs/sprint-history/sprint-07.md` updated with dated results.
4. `docs/inprogress/COPILOT_HANDOFF.md` and `docs/bugs.md` /
   `docs/improvements.md` updated.

## Sprint status: COMPLETE

All SQMG Loop 1/2 findings are CLOSED and automated/definition-of-done gates
are satisfied.
