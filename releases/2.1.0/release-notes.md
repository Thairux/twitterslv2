# Release 2.1.0 — Icon, docs, ambient honesty

## What this is
Minor release on top of 2.0.0 (no schema change, stays v17, no tabbar
change). Closes the validated post-2.0.0 gaps: the missing TSL app icon,
the missing feature documentation, the "endpoint OK but personas still
offline" report, and six small audit gaps.

## Headline changes
- TSL neobrutalist app icon (black + purple `#tsl` plate + yellow/purple
  overlapping shadows) on Android (all densities) and web (manifest +
  favicon).
- Docs: #tslp feature spec (`docs/features/tslp-admin.md`), full
  app-feature inventory (`docs/features/app-features.md`), validated gaps
  (`docs/inprogress/tslp-gaps.md`), sprint I, 2.0.0 + 2.1.0 changelog.
- Fixed ambient honesty: live endpoint client re-resolved on every ambient
  path, model on boot client, honest glimmer/offline origins, Save persists
  the model id, new Settings "Ambient engine" status line (LIVE vs offline
  + exact fallback reason).
- #tslp dashboards count today's likes (were all-time); thread root,
  Chatter, and quote cards show display names; inbox unread dots; Me-page
  #tslp entry card; island-DM matcher fix.

## Verification (SQM gates)
- Independent read-only audit verified every 2.0.0 claim file-by-file; all
  accepted gaps implemented.
- `npm run check` clean; `npm run test` 133/133 (124 existing + 9 new);
  `npm run test:e2e` 7/7 incl. `tslp.spec.ts`; `npm run build` succeeds.
- `assembleRelease` BUILD SUCCESSFUL, signed (CN=peter thairu muigai),
  `apksigner verify` pass; `npm run release:verify` pass.
- Trackers: `docs/bugs.md` BUG-2.1-01…05 CLOSED; `docs/improvements.md`
  IMP-2.1-01…04 CLOSED; only the three approved 2.0.0 LOWs remain OPEN.

## Known limitations (unchanged, approved)
- Muted words remain a global list; Chatter kept as-is; onboarding is
  manual-URL only; reply-audience gating deferred.
- No device attached at build time — on-device smoke test not run for this
  release; install the APK below and report any red screens.

## Artifact
- `releases/2.1.0/twitterslv2-2.1.0-release.apk` (signed release build)
