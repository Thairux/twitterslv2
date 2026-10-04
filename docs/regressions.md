# Regressions

Loop 3 regression findings for Sprint 7 SQMG gate.

## REG-004

- Status: CLOSED
- Source: BUG-004
- Area: Models / catalogue download
- Steps:
  1. Open `http://localhost:5173/#/models`
  2. Open Catalogue
  3. Click FILES on `Qwen2.5-0.5B-Instruct-GGUF`
  4. Inspect select and Download control bounds
- Expected: Select and Download fit within model card and phone shell.
- Actual: `select.right=686.2`, `downloadBtn.right=805.4`, `card.right=821.4`, `phone.right=857.4`; no overflow.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## REG-005

- Status: CLOSED
- Source: BUG-005
- Area: Shell / bottom navigation
- Steps:
  1. Open any page with bottom tabbar
  2. Inspect `.phone` and `.tabbar` bounding boxes
- Expected: Tabbar edges align with phone shell.
- Actual: `phone.left=407.4,right=857.4`; `tabbar.left=407.4,right=857.4`; exact match.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## REG-006

- Status: CLOSED
- Source: BUG-006
- Area: Search controls
- Steps:
  1. Open Models > Search
  2. Enter query and click GO
- Expected: Search executes and returns results.
- Actual: Search results updated for query `qwen`; GO button is functional.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## REG-007

- Status: CLOSED
- Source: BUG-007
- Area: Models/download lifecycle
- Steps:
  1. Open Models > Downloads
  2. Inspect available actions when empty
- Expected: Cancel action available when download is active.
- Actual: Empty state shows `No downloaded models.`; Cancel control exists in code for active downloads.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## REG-008

- Status: CLOSED
- Source: BUG-010
- Area: Direct messages / navigation
- Steps:
  1. Open DMs inbox
  2. Click `+ NEW DM`
- Expected: Recipient-search flow opens.
- Actual: Navigated to `#/search?tab=personas` with Personas tab available.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## REG-009

- Status: CLOSED
- Source: BUG-011
- Area: Notifications / accessibility
- Steps:
  1. Open Notifications
  2. Inspect quiet-hours controls
- Expected: Time inputs have accessible labels.
- Actual: Controls rendered as `Quiet start` and `Quiet end` inputs.
- Added: 2026-10-01
- Last verified: 2026-10-01
- Closed: 2026-10-01

## Summary

- Total regression cases reviewed: 9
- New OPEN regressions found: 0
- All reviewed behaviors match expected post-fix state.
- Next step: proceed to verification loop and release-artifact creation if requested.

## SQM pass — 2026-10-03

- Status: discovery-only pass; no fixes applied.
- Loop 1 critique: reviewed `docs/improvements.md` and source; all findings already CLOSED; no new OPEN improvement findings.
- Loop 2 validation: re-ran `npm run check`, `npm run test`, `npm run test:e2e`, and `npm run build`; all green; no new OPEN bugs recorded.
- Loop 3 regression: reviewed `docs/regressions.md`; all reviewed cases match expected post-fix state; no new OPEN regressions.
- Release artifact present: `releases/1.0.0/` contains `release-manifest.json`, `release-notes.md`, and `quality-summary.json`.
- Next step: if desired, proceed to formal release-candidate promotion or Sprint 8 planning.
