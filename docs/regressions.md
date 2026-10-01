# Regressions

Use this template for Loop 3 regression findings.

## REG-001

- Status: CLOSED
- Source: BUG-001
- Area: Boot / secrets
- Steps:
  1. Launch app with secure storage unavailable
  2. Observe bootstrap behavior
- Expected: User sees actionable retry message.
- Actual: App previously showed generic failure.
- Added: 2026-09-29
- Last verified: 2026-09-29
- Closed: 2026-09-29

## REG-002

- Status: CLOSED
- Source: IMP-002
- Area: Transactions / polls
- Steps:
  1. Create a poll with multiple options
  2. Verify all options persist
- Expected: Poll and options saved atomically.
- Actual: Previously could leave orphaned poll if option insert failed.
- Added: 2026-09-29
- Last verified: 2026-09-29
- Closed: 2026-09-29

## REG-003

- Status: CLOSED
- Source: IMP-004
- Area: Web fallback / blobs
- Steps:
  1. Use web fallback with multiple blob operations
  2. Verify no connection leaks or cache corruption
- Expected: Blob operations reliable across saves/deletes/loads.
- Actual: Previously had IDB connection leaks and cache mutation before persistence.
- Added: 2026-09-29
- Last verified: 2026-09-29
- Closed: 2026-09-29
