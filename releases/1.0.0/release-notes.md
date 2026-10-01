# Release Notes — TwitterSL v2 1.0.0

## Summary
Commercial-viability release for the local-first AI-persona niche. All SQMG loops pass: critique, validation, and regression.

## Fixes
- Fixed web SQLite `INSERT OR IGNORE`/`OR REPLACE` semantics in `WebSQLiteAdapter.execInsert`.
- Fixed `Database.transaction` to flush queued statements through the adapter transaction path, restoring atomicity on native and web.
- Fixed boot-path secret reads with user-facing error handling.
- Fixed `webLoadAll` promise rejection handling to prevent permanent `ensureWebStore()` hangs.
- Fixed `appendBlob` cache mutation order so web blob cache only updates after successful IndexedDB persistence.
- Fixed `webSave`/`webDelete` to always close IndexedDB connections via `try/finally`.
- Fixed `ensureWebStore` to reset its cached promise on failure, enabling retry after IDB errors.
- Fixed `createPoll` and `votePoll` to use atomic transactions, preventing orphaned polls and vote-count races.
- Fixed `toggleReaction` to read-then-toggle without race-condition duplicates.
- Fixed `ProfilePage` loader to catch async errors instead of unhandled rejection.
- Fixed `ComposePage` image upload handler to catch save errors.
- Fixed `SearchPage` with debounced search and wired Go button.
- Fixed `dm-store.ts` architecture leak by removing Infra import.
- Wired `SeedService.seedIfEmpty()` into bootstrap so fresh installs get starter personas and state.

## Verification
- `npm run check` — pass
- `npm run test` — 99 tests pass
- `npm run build` — pass
- `npm run test:e2e` — 4 E2E tests pass
