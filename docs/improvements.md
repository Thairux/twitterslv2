# Improvements

Use this template for Loop 1 critique findings.

## IMP-001

- Status: CLOSED
- Severity: CRITICAL
- Area: Data integrity / web fallback
- Source: Critique
- Evidence: `WebSQLiteAdapter.execInsert` ignored `OR IGNORE`/`OR REPLACE`, causing duplicate follows/mutes/blocks/bookmarks/votes on web.
- Expected:
  INSERT semantics should match SQLite behavior on both native and web.
- Acceptance criteria:
  - [x] `OR IGNORE` prevents duplicate inserts
  - [x] `OR REPLACE` overwrites existing rows
  - [x] Verified via integration + E2E tests
- Implementation:
  Fixed `src/native/db.ts` `execInsert` to branch on mode, and updated store callers.
- Verification:
  `npm run test` and `npm run test:e2e` pass.
- Closed: 2026-09-29

## IMP-002

- Status: CLOSED
- Severity: CRITICAL
- Area: Data integrity / transactions
- Source: Critique
- Evidence: `Database.transaction` queued statements but called `this.db.execute` directly, bypassing native adapter atomicity.
- Expected:
  Multi-statement operations should be atomic on native and web.
- Acceptance criteria:
  - [x] `Database.transaction` flushes through adapter `tx.execute`
  - [x] `approveMemory`, `createPoll`, `votePoll`, `toggleReaction` use transactions
  - [x] Verified via build + E2E
- Implementation:
  Fixed `src/lib/api/db.ts` transaction wrapper; wrapped poll/reaction/memory writes in transactions.
- Verification:
  `npm run test` and `npm run test:e2e` pass.
- Closed: 2026-09-29

## IMP-003

- Status: CLOSED
- Severity: HIGH
- Area: Architecture / dependency direction
- Source: Critique
- Evidence: `src/lib/api/dm-store.ts` imported `DmRow` from `@/store/schema`, violating inward-dependency rule.
- Expected:
  App layer must depend only on Domain/App types, not Infra.
- Acceptance criteria:
  - [x] Remove Infra import from `dm-store.ts`
  - [x] Define local `DmRow` or delegate to Store
  - [x] Verified by `npm run check`
- Implementation:
  Replaced Infra import with local `DmRow` interface in `dm-store.ts`.
- Verification:
  `npm run check` passes.
- Closed: 2026-09-29

## IMP-004

- Status: CLOSED
- Severity: HIGH
- Area: Web fallback / media
- Source: Critique
- Evidence: `webLoadAll` inner promise rejection could hang `ensureWebStore()` forever; `appendBlob` mutated cache before IDB write; `webSave`/`webDelete` leaked IDB connections on failure.
- Expected:
  Blob operations must be reliable and not leak resources on web.
- Acceptance criteria:
  - [x] `webLoadAll` uses `Promise.all` and propagates errors
  - [x] `appendBlob` updates cache only after successful `webSave`
  - [x] `webSave`/`webDelete` close IDB in `finally`
  - [x] `ensureWebStore` resets promise on failure
  - [x] Verified via E2E
- Implementation:
  Updated `src/native/files.ts` web blob paths.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29

## IMP-005

- Status: CLOSED
- Severity: MEDIUM
- Area: UX / Search
- Source: Critique
- Evidence: SearchPage Go button is no-op; no debounce on search input.
- Expected:
  Search should have functional controls and reasonable query cadence.
- Acceptance criteria:
  - [x] Go button focuses input or triggers search
  - [x] 250ms debounce on search effect
- Implementation:
  Wired Go button to focus input; added 250ms debounce to search effect.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29
