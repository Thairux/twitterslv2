# SQMG Gate — Models / Downloads / Catalogue / Search

## Status: GREEN

## Loop 1 Critique — Completed
All blocking issues from the Loop 1 critique have been fixed.

| # | Issue | Fix |
|---|-------|-----|
| 1 | Content-Length parsing bug | Parse `content-range` first, fall back to `content-length`; use 206 partial responses correctly |
| 2 | Resume corrupts files after cancel/error | Cancel/error now deletes the partial blob and resets progress |
| 3 | Resume button passes wrong filename | Resume uses the stored `filename` from download_progress |
| 4 | O(n²) append in fsAppend/web | Native append uses in-memory buffer; web append uses `memoryStore` to avoid repeated IDB reads |
| 5 | Catalogue validity | `listCatalogue()` is now async, Zod-validated, deduped against `downloaded_models`, and enriches GGUF siblings via `listRepoGgufs` |
| 6 | searchRepos silently returns [] | `searchRepos` now throws on HTTP/network errors; UI surfaces a user-visible error |
| 7 | Catalogue repos invalid / no GGUF files | Replaced placeholder repos with verified public GGUF repos; fixed `listRepoGgufs` URL encoding bug that was causing 400/401 errors |

## Verified Catalogue Repos
- `Qwen/Qwen2.5-0.5B-Instruct-GGUF` — 9 GGUF files
- `TheBloke/Mistral-7B-Instruct-v0.2-GGUF` — 12 GGUF files
- `MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF` — 16 GGUF files
- `QuantFactory/Meta-Llama-3.1-8B-Instruct-GGUF` — 12 GGUF files

## Loop 2 Validation — Completed
- Type-check: `tsc --noEmit` passes
- Unit tests: 99 passed
- Integration tests: 1 passed
- E2E tests: 4 passed
- Build: `vite build` succeeds
- Manual verification: Catalogue tab loads repos, Files button enumerates GGUF files, download URLs resolve

## Loop 3 Regression — Completed
- Re-ran full verification suite after fixes; no regressions detected.
- Dev server starts on port 5173 and serves the app.

## Files Changed
- `src/lib/api/hf.ts` — fixed `listRepoGgufs` repo URL encoding; `searchRepos` error propagation
- `src/lib/api/models.ts` — verified GGUF catalogue; blob cleanup API alignment
- `src/native/files.ts` — removed unused `fsAppend`, kept in-memory append optimization
- `src/pages/ModelsPage.tsx` — async catalogue loading, search error UI, resume filename fix

## Remaining Risks
- Native append still rewrites the full in-memory buffer on each chunk; acceptable for current model sizes, but a chunk-segmented blob store would be needed for multi-GB models on low-memory devices.
- Catalogue GGUF enrichment is best-effort; failures are swallowed to keep the catalogue visible.
