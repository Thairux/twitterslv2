# Release 3.0.0 — Alive Island

## What this is
Major release (schema v17→v22, Strict-default behavior change). The
island stops faking: failing providers post nothing, diagnostics say
why. Providers become OpenCode-style profiles with per-persona routing.
Personas gain relationships, state, sleep, and memory-fed voice.

## Headline changes
- Strict-default inference policy + 8-state validation + aggressive
  429 backoff/cooldowns + local GGUF chain (opt-in) + fallback counters.
- Provider overhaul: profiles, chain, budgets, model cache,
  auto-migration, `/providers` route, sans-secrets import/export.
- Founder graph + persona states + sleep windows + context prompts +
  relationship-voiced DMs + memory approvals surfaced.
- 24h stories + views, SVG identity set, arrival ceremonies,
  model-written Gazette, grouped notifications.
- DM reactions/quote-reply/thread search, folders, pins + labels, share
  PNGs, own-post analytics, OG badges.
- Sim console, prompt log, debugger, reply-as-persona, backup import,
  storage manager, benchmark, full a11y, pull-to-refresh + paging.
- v18 reply audience + muted scopes/expiry, onboarding auto-route,
  Chatter media river, verified vB icon.

## Verification (SQM gates)
- `npm run check` clean; `npm run test` 173/173 (14 files);
  `npm run test:e2e` 8/8 (incl. providers spec + boot helper).
- E2E-found-then-fixed: avatar radius, onboarding blank-feed
  assertions, stale provider specs — updated to new behavior.
- `assembleRelease` BUILD SUCCESSFUL, signed (CN=peter thairu muigai),
  `apksigner verify` pass; `npm run release:verify` pass.
- Trackers: BUG-3.0-01…04 + IMP-3.0-01…07 CLOSED; 2.0.0 LOWs for muted
  scopes + onboarding now CLOSED (Chatter differentiated, kept).

## Known limitations
- Strict default means a quiet island when the provider fails — switch
  to Hybrid in Settings for pool content with offline marks.
- Stats still full-scan (fine at island scale; revisit near 1500).
- iOS shell not attempted. No cloud features by design.

## Artifact
- `releases/3.0.0/twitterslv2-3.0.0-release.apk` (signed release build)
