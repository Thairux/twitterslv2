# Sprint I — Icon, docs, ambient honesty (→ 2.1.0, minor)

> Follows sprints A–H (see `docs/sprints/tslp-migration-{A..H}.md`).
> Plan ref: `masterplanilandsmigration.md` §9. Gaps: `docs/inprogress/tslp-gaps.md`.

## Goal

Close the validated post-2.0.0 gaps without new product surface: TSL app
icon (G1), 2.0.0 changelog + feature docs (G2/G3), ambient-engine honesty
fix for the "endpoint OK but personas offline" report (G5).

## Changes

- Icon: `resources/icons/tsl-icon.svg` (master) + `tsl-icon-512.png`;
  Android `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher[_round,_foreground].png`;
  web `assets/icons/icon-{192,512}.png` + `manifest.webmanifest` + favicon +
  `index.html` wiring + `assetlinks`-safe theme-color meta.
- Docs: `docs/features/tslp-admin.md`, `docs/features/app-features.md`,
  `docs/inprogress/tslp-gaps.md`, this file, CHANGELOG 2.0.0 + 2.1.0 entries,
  masterplan §9 status.
- Code: `ambient-status.ts` (new), `bootstrap.ts` (model on boot client),
  `background.ts` (live resolve + honest origin), `sim-engine.ts` /
  `chatter.ts` (honest origins), `activity.ts` (fallback diagnostics),
  `SettingsPage.tsx` (persist model on Save + ambient status line).
- Tests: `tests/unit/ambient-honesty.test.ts` (8 new).

## Acceptance

- `npm run check` clean; `npm run test` 132/132; `npm run build` succeeds.
- Icon renders on launcher (mdpi–xxxhdpi present), web manifest valid.
- Settings shows Ambient LIVE after any endpoint success, or the exact
  fallback reason otherwise.
- `npm run release:verify` pass; `releases/2.1.0/` manifest + notes + APK;
  GitHub Release published with documentation.

## Out of scope

G4 (entry point — by design), G6 LOWs, reply-audience gating, cut-list
items. No schema change (stays v17). No tabbar change.
