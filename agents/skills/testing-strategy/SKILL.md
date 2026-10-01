# testing-strategy — Green From Day 0

Load before writing tests. (v1 lesson: polish retrofitted late needed a
274-assert suite to catch up — v2 keeps `tests/` green from Sprint 0.)

## Targets
- Domain (`src/lib/domain/`): unit ≥ 90%.
- Api/store/native adapters: integration ≥ 80% (run against BOTH the
  Capacitor adapter mock and the web fallback).
- E2E (Playwright): golden path Post → Feed → Replies → DM → Background ping.
- `npm run check` (tsc) + `npm run test` before every stop.

## Rules
- Test behavior, not coverage theater. Error paths + edge cases required:
  endpoint down, malformed model response, quiet-hours notify, edit-window
  expiry, migration re-run idempotency.
- No test may depend on network or on-device plugins; adapter interfaces
  are mocked at the boundary.
