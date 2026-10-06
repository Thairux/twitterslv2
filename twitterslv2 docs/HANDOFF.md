# HANDOFF — TwitterSL v2

## What this is
v2 = Capacitor port of v1 (`../twittersl`). The app is implemented through
Sprint 9 social/model/onboarding/export surfaces; the active work is ongoing
quality verification and production readiness.

## Current state
- Root tooling is installed and verified through the current test/build gates.
- `src/` contains working pages, app/domain/infra layers, native/web adapters,
  styles, and persistence.
- `agents/` contains 15 project-scoped skills, 12 rules, 1 hook, and the
  registry in `agents/skills-lock.json`.
- `alldemos/ocdemo/` is the TSL-branded UI truth. `alldemos/agydemo/` is the
  archived v1 reference and remains frozen.
- `twitterslv2 docs/` contains architecture, feature contracts, sprint plans, quality
  trackers, and the active handoff.

## How to continue
1. Read `agents/skills/aboutrepo/SKILL.md`, then the mandatory first-load docs.
2. Load the relevant sprint skills from `agents/skills-lock.json`.
3. Run `npm run check`, `npm test`, `npm run test:e2e`, and `npm run build`.
4. Record outcomes in `twitterslv2 docs/sprint-history/` and update the handoff.

## Do not touch
- `src/lib/domain/*` purity (no Capacitor/SQLite/fetch, rule 04).
- `src/store/schema.sql` merged sections (append-only migrations, rule 03).
- `alldemos/agydemo/*` (frozen v1 reference).
- Secrets handling (rule 07): Preferences/secure storage only.

## Next session files
`twitterslv2 docs/inprogress/COPILOT_HANDOFF.md`, `twitterslv2 docs/sprint-history/current-sprint.md`,
`twitterslv2 docs/sprint-history/sprint-09.md`, and
`agents/skills/testing-strategy/SKILL.md`.
