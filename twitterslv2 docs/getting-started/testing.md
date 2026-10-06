# Testing (see agents/skills/testing-strategy/)

- `npm run check` — typecheck. `npm run test` — vitest. `npm run test:e2e` — Playwright.
- `scripts/verify-sprint.ps1` — sprint close gate.
- Coverage: domain ≥ 90%, api/store ≥ 80%. E2E golden path must stay green.
- Sprint 3 ports v1 `scripts/logic-tests.js` (274 asserts) as domain unit tests.
