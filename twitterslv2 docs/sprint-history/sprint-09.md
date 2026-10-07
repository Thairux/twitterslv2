# Sprint 09 — 3.0.0 Alive Island (S1–S7 batch per approved plan)

> Plans: `twitterslv2 docs/sprints/v3-S1..S7-*.md`. Specs: `features/inference-policy.md`, `features/provider-system.md`.

## What
Major release (schema v17→v22, tabbar unchanged, Strict-default behavior
change). Inference trust, provider overhaul, real personas, living
island, social depth, platform console, reply audience, icon.

## Files touched (new)
`api/inference-policy.ts`, `api/providers.ts`, `api/persona-context.ts`,
`api/storage-man.ts`, `api/share-image.ts`, `components/PersonaAvatar.tsx`,
`components/StoriesStrip.tsx`, `pages/ProvidersPage.tsx`,
`tests/unit/{inference-policy,providers,persona-context,island,social-depth,platform,release-gate}.test.ts`,
`tests/e2e/{providers.spec,boot}.ts`, sprint docs v3-S1..S7 + 2 feature specs.
Modified: activity, sim-engine, chatter, background, bootstrap, store,
model-client, dm-store, domain/post, native/secrets, api/secrets,
App, Compose, Feed, Thread, Profile, Persona, DMs, Friend, FriendRoute(none),
Gazette, Notifications, Search(none), Chatter, Onboarding, Settings, Models,
Tslp, PostCard, themes.css, migration-defs (v18–v22), schema.ts,
deleted `components/ProviderSettings.tsx`.

## Verification
- `npm run check` clean; `npm run test` 173/173 (14 files); `npm run
  test:e2e` 8/8 (incl. new providers spec + boot helper).
- E2E-found-then-fixed: avatar negative radius, onboarding blank-feed
  assertions, stale provider-manager specs (updated to new behavior).
- `npm run build` ok; `assembleRelease` signed; `apksigner verify` pass;
  `npm run release:verify` pass; adb update attempted.
- Trackers: BUG-3.0-01…04 + IMP-3.0-01…07 CLOSED; only approved LOWs
  (muted legacy fallback kept in code, Chatter differentiated not
  deleted) — both LOWs from 2.0.0 now CLOSED via scopes UI + river.
- Invariants: domain pure (post.ts additive only); secrets never SQLite
  (profile keys in secure storage); append-only schema; friend-first
  kept; no unapproved egress (explicit buttons only).
- DoD: all gates pass (lint vestigial as before).

## Shipped
Release 3.0.0 (versionCode 16), GitHub Release Latest with signed APK.
