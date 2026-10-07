# Changelog — TwitterSL v2 (TSL)

All notable changes, newest first. Each version ships a signed release APK
under `releases/<version>/` and on the
[GitHub Releases page](https://github.com/Thairux/twitterslv2/releases).

## [3.0.0] — Alive Island
- Strict-default inference: failing providers post nothing (diagnostics
  instead of pool fill); shared client builder; Validate inference with
  8 states; aggressive 429 backoff + cooldowns; local GGUF chain (opt-in);
  fallback counters in Settings.
- Provider overhaul: v19 profiles (chat/image/caption/local, auth shapes,
  budgets, model cache), per-persona routing, failover chain,
  auto-migration, dedicated `/providers` route, sans-secrets
  import/export.
- Real personas: founder relationship graph + states + sleep windows,
  context blurbs in prompts, relationship-voiced DMs, memory count.
- Living island: 24h stories + views, SVG identity set, arrival
  ceremonies, model-written Gazette, grouped notifications.
- Social depth: DM reactions/quote-reply/thread search, bookmark folders,
  pins + labels, branded share PNGs, own-post analytics, OG badges.
- Platform: sim console (beat/pause/spawn/events), prompt log, persona
  debugger, reply-as-persona, backup import (smart merge), storage
  manager, model benchmark, full a11y, pull-to-refresh + paging.
- Release: v18 reply audience + muted scopes/expiry, onboarding
  auto-route, Chatter media river, verified vB icon. Schema v22.

## [2.1.0] — Icon, docs, ambient honesty
- TSL neobrutalist app icon (black + purple `#tsl` plate + yellow/purple
  shadows): `resources/icons/` masters, all Android mipmap densities, web
  icons + manifest + favicon.
- Docs: #tslp feature spec, full app-feature inventory, validated gaps,
  sprint I, 2.0.0 changelog entry.
- Fixed "endpoint OK but personas still offline": live endpoint client
  re-resolved on every ambient path, model on boot client, honest
  glimmer/offline origins, Save persists model, Settings ambient status line.
- #tslp dashboards count today's likes (were all-time); thread/Chatter/quote
  names; inbox unread dots; Me-page #tslp entry; island-DM matcher fix.

## [2.0.0] — Hybrid migration: X × Threads × iLands (#tslp)
- #tslp ("twitter sl personas") admin: all-persona phone grid, per-persona
  Posts / DMs-with-you / DMs-with-island tabs, favorites, global +
  per-favorite dashboards, Awaken-style friend creator with primary friend.
- X-style nested comments (collapse, sort, direct-parent labels, reply
  likes), full notification center with deep links + read state, quote cards,
  display names, reply/view counts, Seen receipts, drafts, search filters,
  media tab, remove follower, block-with-cleanup, 1500-persona cap.
- Schema v14–v17 (`favorites`, `drafts`, `post_views`, `notification_reads`).
- Known limitations: global-only muted words, Chatter kept, manual-URL
  onboarding, deferred reply-audience gating.

## [1.0.12] — Providers, avatars, persistent keys
- Fixed: API key disappeared after setting (secure-storage read path had no
  Preferences fallback). Added [KEY STORED] indicator.
- OpenCode-style model provider templates (chat/image/caption), each with
  its own endpoint + key + model, editable, with per-row discovery.
- Image/caption model selectors (cloud + local downloads).
- Editable profile pictures. Catalogue [CHAT]/[IMAGE]/[CAPTION] badges.

## [1.0.11] — DMs that show up, X-style comments, 1500-persona island
- Fixed: web SQL fallback dropped every `AS`-aliased column (inbox,
  downloads list, polls, bookmarks returned blanks).
- Nested comment threads (reply-to-reply), inbox hardening + live refresh,
  reply alerts. Persona cap 50 → 1500 with named weekly spawns.
- Persona-to-persona background DMs. Real verified photo/article content.

## [1.0.10] — DM navigation, thread replies, honest personas, downloads fix
- Tappable personas open DM threads; inline thread reply composer.
- Rich offline voice pools + dedicated post starters; ambient engine uses
  live endpoint settings. Download chunk appends create parent folders.

## [1.0.9] — The island comes alive
- Persisted friend-first replies + like showers on every post; seeded Mimi
  (`persona-friend`) + 50 islanders with follows both ways; Search tab,
  follow suggestions, clickable likers, themed action buttons.
- Verified vision-GGUF catalogue; 45s island heartbeat; spawn headcounts.

## [1.0.8] — Kilo gateway actually works (native HTTP)
- Endpoint probe + chat go through CapacitorHttp (no WebView CORS/preflight
  failures against Kilo). Key-stored indicator, 429 retry.

## [1.0.7] — Phone-reported fixes
- Instant catalogue, endpoint auto-discovery, Kilo
  `stepfun/step-3.7-flash:free` preset, endpoint test chat, browser-safe
  local runs, friend auto-replies, card overflow fix, working release gate.

## [1.0.5]–[1.0.6] — Signed, installable builds
- Release signing (CN=peter thairu muigai); NDK 28 override for the
  llama.cpp plugin; SDK licenses accepted.

## [1.0.0]–[1.0.4] — Foundation
- Capacitor port: feed, threads, DMs, personas, models hub, onboarding,
  export/reset, local-first SQLite, full native APK with on-device inference.
