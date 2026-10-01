# Bugs

Use this template for Loop 2 validation findings.

## BUG-001

- Status: CLOSED
- Severity: CRITICAL
- Area: Boot / secrets
- Source: User exploration
- Evidence: `bootstrap.ts` called `nativeSecrets.getModelEndpoint()` / `getApiKey()` without try/catch; secure storage failures crashed boot with raw "Initialization failed".
- Steps to reproduce:
  1. Corrupt or deny secure storage access
  2. Launch app
  3. Observe hard crash on bootstrap
- Expected: Graceful error with retry guidance.
- Actual: App shows generic initialization failure.
- Fix:
  Wrapped secret reads in try/catch with user-facing error message.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29

## BUG-002

- Status: CLOSED
- Severity: HIGH
- Area: Media / web
- Source: User exploration
- Evidence: `useBlobUrl` created object URLs without revoking prior URLs across re-renders, leaking memory.
- Steps to reproduce:
  1. Open a feed with multiple image posts
  2. Scroll to trigger mount/remount cycles
  3. Monitor memory / object URL count
- Expected: Old blob URLs revoked on cleanup.
- Actual: URLs accumulate.
- Fix:
  Track URLs in a ref and revoke all tracked URLs on cleanup.
- Verification:
  Manual review; E2E passes.
- Closed: 2026-09-29

## BUG-003

- Status: CLOSED
- Severity: HIGH
- Area: Data integrity / polls
- Source: User exploration
- Evidence: `votePoll` checked existing vote outside transaction; rapid taps could double-increment vote count.
- Steps to reproduce:
  1. Open a poll
  2. Tap Vote rapidly multiple times
  3. Observe vote count higher than expected
- Expected: One vote per user per poll.
- Actual: Count could exceed one due to race.
- Fix:
  Rely on unique constraint and catch duplicate vote errors; remove external check.
- Verification:
  `npm run test:e2e` passes.
- Closed: 2026-09-29
