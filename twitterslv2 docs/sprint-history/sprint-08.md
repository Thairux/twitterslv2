# Sprint 08 — 2.1.0: icon, docs, ambient honesty (sprint I)

> Plan: `twitterslv2 docs/sprints/tslp-migration-I.md` + `masterplanilandsmigration.md` §9.
> Gaps: `twitterslv2 docs/inprogress/tslp-gaps.md`. Release: `releases/2.1.0/`.

## What
Minor release (no schema change, v17; no tabbar change). Closed post-2.0.0
gaps: TSL app icon, feature documentation, "endpoint OK but personas
offline" ambient bug, six audit S-gaps.

## Files touched
- New: `src/lib/api/ambient-status.ts`, `tests/unit/ambient-honesty.test.ts`,
  `resources/icons/tsl-icon.{svg,png}`, `public/icons/*`,
  `public/manifest.webmanifest`, docs (`tslp-admin.md`, `app-features.md`,
  `tslp-gaps.md`, `tslp-migration-I.md`), `releases/2.1.0/*`.
- Modified: `bootstrap.ts`, `background.ts`, `sim-engine.ts`, `chatter.ts`,
  `activity.ts`, `stats.ts`, `SettingsPage.tsx`, `ThreadPage.tsx`,
  `ChatterPage.tsx`, `PostCard.tsx`, `DMsPage.tsx`, `ProfilePage.tsx`,
  `TslpPage.tsx`, `index.html`, `package.json`, `android/app/build.gradle`,
  `quality-manifest.json`, `CHANGELOG.md`, `masterplanilandsmigration.md`,
  `twitterslv2 docs/bugs.md`, `twitterslv2 docs/improvements.md`, `tests/unit/tslp.test.ts`.

## Verification
- `npm run check` clean; `npm run test` 133/133; `npm run test:e2e` 7/7;
  `npm run build` ok; `assembleRelease` signed (CN=peter thairu muigai),
  `apksigner verify` pass; `npm run release:verify` pass.
- `npm run lint` N/A — eslint is not installed (script vestigial, no
  eslint dep in package.json; pre-existing).
- Trackers: BUG-2.1-01…05 + IMP-2.1-01…04 CLOSED; only approved 2.0.0 LOWs
  remain OPEN. No device attached — on-device smoke not run for 2.1.0.
- Invariants: friend-first intact; secrets only read, never written, by
  ambient paths; no migration (append-only holds); TSL brand, no AGY string.
- DoD: all gates pass except vestigial lint (documented above).

## Shipped
Commit `51008b1`, tag `2.1.0`, GitHub Release "TSL 2.1.0 — Icon, docs,
ambient honesty" (latest) with signed APK + release notes.
