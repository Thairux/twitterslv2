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

## IMP-006

- Status: CLOSED
- Severity: HIGH
- Area: Responsive Models UX
- Source: SQMG Loop 1 critique + Loop 2 browser validation
- Evidence: Models catalogue uses a horizontal `.field-row` containing a
  long-intrinsic-width `<select>` and Download button. At the dev browser
  viewport (`628x730`), the selector reached `x=539` and the Download button
  reached `x=658`, outside the model card (`right=495`) and phone shell
  (`right=531`).
- Expected:
  File selection and the primary Download action remain visible and usable at
  narrow browser/dev-tool widths.
- Acceptance criteria:
  - [x] File selector can shrink or wrap without horizontal overflow.
  - [x] Download remains inside the model card and viewport.
  - [x] Layout is checked at narrow and desktop widths.
- Implementation:
  Made `.field-row` wrap in Models file rows; gave select a flexible basis with
  `minWidth: 0`; wrapped Download/Cancel controls in a stacked column so the
  primary action never leaves the card.
- Verification:
  `npm run check`, `npm test`, and `npm run build` pass.
- Closed: 2026-10-01

## IMP-007

- Status: CLOSED
- Severity: MEDIUM
- Area: Shell / responsive geometry
- Source: SQMG Loop 1 critique + Loop 2 browser validation
- Evidence: `.tabbar` is `position: fixed` with `width: 100%` and no explicit
  left/right anchoring. In the browser pass it measured
  `left=85.4,right=535.4,width=450`, while `.phone` measured
  `left=81.4,right=531.4`; the navigation therefore crosses the shell's right
  boundary by 4px.
- Expected:
  The bottom navigation shares the phone shell's exact horizontal bounds at
  every supported viewport.
- Acceptance criteria:
  - [x] Tab bar is anchored to the shell rather than the viewport's static
    position.
  - [x] Right and left edges match the phone shell including borders.
  - [x] No horizontal document overflow is introduced.
- Implementation:
  Centered the fixed tabbar with `left: 50%` and `transform: translateX(-50%)`
  while preserving the existing max-width and borders.
- Verification:
  `npm run check`, `npm test`, and `npm run build` pass.
- Closed: 2026-10-01

## IMP-008

- Status: CLOSED
- Severity: MEDIUM
- Area: Models/download controls
- Source: SQMG Loop 1 critique
- Evidence: `ModelService.cancelDownload()` exists, but `ModelsPage` exposes
  Download, Resume, and Delete only; there is no user-visible Cancel action
  while a model is downloading.
- Expected:
  Users can stop a long-running model download without closing the page or
  relying on network failure.
- Acceptance criteria:
  - [x] Active downloads expose a Cancel action.
  - [x] Cancellation updates progress state and removes partial blob data.
  - [x] The control is available in Search, Catalogue, and Downloads contexts.
- Implementation:
  Added `cancelIds` state, `handleCancel` wiring to `modelService.cancelDownload`,
  and Cancel buttons alongside Download in Search, Catalogue, and Downloads rows.
- Verification:
  `npm run check`, `npm test`, and `npm run build` pass.
- Closed: 2026-10-01

## 2.0.0 migration critique (subagent discovery 2026-10-06, all accepted items implemented)

| ID | Status | Severity | Area | Resolution |
|---|---|---|---|---|
| IMP-2.0-01 | CLOSED | HIGH | Friend identity | Triple friend identity (coral/Mimi/pearl) resolved via `primary_friend_id` + `/friend` resolver; Friend tab deterministic |
| IMP-2.0-02 | CLOSED | HIGH | Visible stubs | Quote cards, display names everywhere, poll % fix, thread direct-parent labels |
| IMP-2.0-03 | CLOSED | HIGH | Crash class | ThreadPage hooks-after-early-return crash fixed; audit found PersonaPage same class fixed |
| IMP-2.0-04 | CLOSED | HIGH | Web SQL parity | `AS` aliases + ALTER TABLE support added to fallback; 17 queries repaired |
| IMP-2.0-05 | CLOSED | MEDIUM | Stale clients | Ambient paths resolve live endpoint/key/model instead of boot-time client |
| IMP-2.0-06 | OPEN (LOW, deferred w/ approval) | LOW | Muted words | Per-surface scope + expiry deferred; global list retained |
| IMP-2.0-07 | OPEN (LOW, deferred w/ approval) | LOW | Chatter | Remains feed-adjacent; not removed pending product call |
| IMP-2.0-08 | OPEN (LOW, deferred w/ approval) | LOW | Onboarding | Manual URL only; no auto-routing (cut-list item 9) |
