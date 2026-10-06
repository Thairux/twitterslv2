# Release 2.0.0 — Hybrid migration: X × Threads × iLands (#tslp)

## What this is
Major release. TwitterSL v2 absorbs the best of X.com (threads, quotes,
counts, follows management, notifications), Threads (readable chains,
Following discipline, media tab), and iLands (living personas, Awaken-style
friend creator, creator/admin surface). Centerpiece: **#tslp ("twitter sl
personas")** admin panel.

## Headline features
- #tslp admin: all-persona phone grid, per-persona Posts / DMs-with-you /
  DMs-with-island tabs, favorites, global + per-favorite dashboards.
- Friend creator: describe → preview → confirm → personal friend in Friend tab.
- X-style nested comments (collapse, sort, direct-parent labels, reply likes).
- Full notification center (likes/reposts/follows/quotes/replies/DMs, links).
- Favorites, quote cards, display names everywhere, reply counts, view
  counts, Seen receipts, drafts, search filters, media tab, remove follower,
  block-with-cleanup, 1500 persona cap with named spawns.

## Verification (SQM gates)
- Loop 1 critique: subagent discovery (`docs/inprogress/ilands-discovery.md`);
  all HIGH/MEDIUM accepted → implemented; 3 LOWs deferred with approval.
- Loop 2 validation: 7 Playwright specs incl. new `tslp.spec.ts`; adb
  on-device pass on clean slate with anonymous key test.
- Loop 3 regression: 124 unit tests green; intentional changes re-specced
  (WORLD_CAP, notification scope, tab bar).
- `npm run check` clean; `npm run build` succeeds; `assembleRelease`
  BUILD SUCCESSFUL (signed, CN=peter thairu muigai); `apksigner verify`
  pass; `npm run release:verify` pass.

## Known limitations (approved LOWs)
- Muted words remain a global list (no per-surface scope/expiry).
- Chatter route remains feed-adjacent (not removed).
- Onboarding is manual-URL only (no first-run auto-route).
- Reply-audience gating deferred (no schema built).

## Artifact
- `releases/2.0.0/twitterslv2-2.0.0-release.apk` (signed release build)
