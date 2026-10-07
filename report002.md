# REPORT002 — Combined AI Review: ChatGPT + Grok + Local Codebase Analysis

> Self-contained companion to `report001.md`. Sources: (1) ChatGPT session
> "Report Review Plan" 2026-10-07 (repo validation vs `Thairux/twitterslv2`
> @ `4e29ba5`, SQM loops, Gemini prompt, icon deferral); (2) Grok session
> "App Report Analysis and GitHub MCP Setup" 2026-10-07 (repo validation,
> commit walk, offline-fallback diagnosis, brainstorm, icon session
> memory); (3) my own fresh analysis of the CURRENT local codebase
> (release 2.1.0 + vault-rename commit `4e29ba5`, which equals remote HEAD
> — so "current codebase" and "remote repo" are the same tree).
> Purpose: single merged truth for planning mode → sprints → build mode.

## 1. Consensus — all three analyses agree

1. **report001 is broadly accurate.** Stack, 4-layer architecture, 10
   invariants, 26-table v17 schema, #tslp, friend creator, 133 tests + 7
   e2e green, signed 2.1.0. Only drift found: icon state + sprint
   numbering trivia.
2. **The #1 problem is inference reliability, not social UI.** The app is
   past prototype; the defining defect is personas visibly running on
   canned pools while the user believes a model is configured.
3. **Probe success ≠ inference success.** `ModelClient.probe()` accepts
   `/v1/models`, `/models`, `/health`, or base URL; `ModelClient.chat()`
   always POSTs `{base}/v1/chat/completions`. An "endpoint OK" badge does
   not prove the endpoint+model+key combination can complete a chat.
4. **Fallback is exception-driven and too eager.** Any throw in `chat()`
   (auth, model, endpoint, timeout, parse, network) → offline pool,
   everywhere (posts, replies, DMs, friend-first, persona DMs). One 429
   retry only. Silence is by design (try/catch) but hides the cause.
5. **Local GGUF inference is disconnected from ambient.** A real native
   adapter exists (`native/inference.ts` llama.cpp; `api/local-
   inference.ts` with `tryLocalChat`), but ZERO ambient paths call it —
   only the Settings "Run local model" button does. The real chain today
   is cloud → canned pools, not cloud → local → pools.
6. **Product north star (shared wording): TSL is a persistent AI society
   that happens to use a social-media interface** — not a fake Twitter
   with generated posts. Every feature must serve persistence, social
   coherence, aliveness.
7. **Fix intelligence before adding world:** order is diagnostics/policy
   → personas → island → feed → polish. No shiny features on a broken
   inference pipe. Do NOT clone X/Threads (no monetization, ads,
   Spaces, federation, payouts, video infra).
8. **Icon is deferred work with a recorded spec**, not to be generated
   until told (both sessions parked it; see §5 for new evidence that it
   is genuinely broken, not just ugly).

## 2. ChatGPT-only contributions (adopted)

- 10-point SQM test matrix (endpoint/key/model valid-vs-invalid,
  /models-OK-but-chat-fails, malformed/timeout/429/unavailable,
  local available/unavailable/crash/malformed, cloud→local→offline
  transitions, runtime reconfiguration, restart, native vs browser,
  persona-JSON valid/invalid/partial, ambient background cases).
- Inference state machine proposal:
  READY_LIVE, AUTH_FAILURE, MODEL_FAILURE, ENDPOINT_FAILURE, TIMEOUT,
  RATE_LIMITED, LOCAL_READY, LOCAL_FAILURE, OFFLINE.
- Feature ranking axes: differentiation × value × complexity ×
  architectural risk × inference dependency.
- Platform editing-capability matrix (verified with cited docs):
  ChatGPT GitHub App read-only; Codex can write; Gemini import-only
  (explicitly no write, no history); Grok connector exists, writes
  undocumented (custom MCP could add them; local Grok Build can
  edit+commit). Consequence adopted: OpenCode stays the implementation
  agent; the others are strategists — no direct-edit workflow exists
  for this repo today.
- Threads/X deltas worth stealing: custom feeds, follower-only
  replies/quotes, reply approvals, algo controls (Dear Algo/Your Algo
  → "Island Algo"), Articles/long-form (explicitly NOT recommended).

## 3. Grok-only contributions (adopted)

- Commit-walk regression method: use git log to tie each fix to its
  bug (1.0.8 CORS, 1.0.11 AS-alias, 1.0.12 key fallback, 2.1.0 stale
  client) and check each for partial-fix regressions. Verdict adopted:
  no new regressions from recent commits; 2.1.0 fixed the stale-client
  cause, not the readiness cause — investigate, don't relabel.
- Concrete ambient tunables: exponential backoff + 429 cooldown,
  short-lived "last known good" client cache, prominent offline banner
  after >2 failed beats, one-tap "Force live ambient test" in
  Settings, persona-specific pool templates + larger pools, subtle
  offline badge on pool-made content.
- iLands-gap list adopted: reliable live personas, richer creator,
  permanent-feeling memory, per-persona visual identity (initials are
  weak), events that matter, DM media (schema already has imagePath),
  visible affinity/relationship meter, spawns with a story.
- Diagnostic ladder for the user: ambient-status line → test chat →
  if test-OK-but-ambient-offline, suspect background-context config
  pickup (race).

## 4. My own analysis — current codebase (new or corrective)

### CONFIRMED with file evidence
- C1. Probe/chat mismatch is real: `model-client.ts` probe
  (`/v1/models`, `/models`, `/health`, base) vs `chat()`
  (`${base}/v1/chat/completions`). A gateway answering `/models`
  while rejecting chat (bad model/key/path) reads "OK" then pools.
- C2. Local inference is wired to nothing ambient:
  `runLocalModel`/`tryLocalChat`/`getLocalInferenceEngine` referenced
  ONLY in `SettingsPage.tsx` (+ definitions). `tryLocalChat` has no
  callers at all — a finished, tested-nothing fallback path.
- C3. Pools are tiny and generic: OFFLINE_FRIEND_REPLIES 12 lines,
  OFFLINE_CROWD_REPLIES 20, OFFLINE_POST_STARTERS 24
  (`lib/domain/engine.ts:20-83`). At 45s beats + replies + DMs,
  repetition is visible within a day. Grok's "~20 phrases" is exact.
- C4. Six independent fallback sites, all silent-by-design:
  `activity.ts` ambient-reply + random-dm, `sim-engine.ts`
  friend-reply + crowd-reply, `chatter.ts` post + p2p-dm,
  `background.ts` friendPing. 2.1.0 added `noteAmbientFallback`
  (console + in-memory) + Settings line — diagnosis exists but no
  policy (every site still falls back unconditionally).
- C5. Single 429 retry (`model-client.ts` `rateLimitedOnce`), fixed
  30s chat timeout, no backoff, no cooldown, no per-beat budget.

### CORRECTED (both transcripts slightly off)
- R1. Grok's "stale key race in background context" is unlikely to be
  the live bug: 2.1.0's `resolveAmbientClient` awaits `refreshConfig()`
  then reads endpoint/key/model synchronously per call — there is no
  cached key to go stale anymore. The likelier live failure ranking:
  (1) free-tier 429 storms on ambient volume, (2) model-id mismatch
  (gateway 400/404), (3) key missing for providers that need one,
  (4) response-shape mismatch (ParseError). Planning should instrument
  BEFORE theorizing: the `lastWhere/lastError` counters already exist
  — aggregate them per provider for a day and rank real causes.
- R2. ChatGPT's "test the matrix" is right, but half the matrix is
  already unit-covered (`model-client.test.ts`: 429×1 retry, 429×2
  throws, model-in-body, model-omitted). The uncovered half is
  integration-level (real /models-OK-chat-fails, restart persistence,
  runtime provider switch) — that is where new tests belong, not
  re-testing the client.
- R3. "Endpoint Check OK" has a second hole neither transcript named:
  `handleCheck`/`discoverModels` build their client WITHOUT a model
  (`SettingsPage.tsx liveClient()`), while `handleTestChat` passes the
  model explicitly. So Check Mantra today is: Check⊇{no model needed},
  Test⊇{explicit model}, Ambient⊇{persisted model}. Three different
  client shapes → three different pass/fail outcomes on the same
  screen. The fix is one shared `buildValidatedClient()` used by all
  three (plus FriendPage's already-correct copy).

### NEW — icon is structurally broken, not just unliked (verified by rendering)
- N1. I rendered `mipmap-xxxhdpi/ic_launcher_foreground.png`: the
  `#tsl` glyph sits BELOW the purple plate, half outside it. Root
  cause found in the generator (`gen_tsl_icon.py`): `draw_plate`
  scales geometry toward the canvas origin while the label stays
  canvas-centered, so at foreground scale (0.62) plate-center and
  text-center diverge. The adaptive-icon mask then crops the text.
  The master 512px looked fine, which is why this slipped through.
  Fix for build mode: rewrite geometry centered on canvas (not
  origin), regenerate ALL densities + foregrounds, and RENDER-VERIFY
  every PNG (including a circular-mask preview) before release. Keep
  the user's parked ChatGPT icon brief as the design target; treat
  the current set as placeholder.
- N2. `persona-generator.ts` offline fallback (`Anon ### / mysterious
  / generated offline`) fires inside the friend creator with only a
  `via` label — adopt ChatGPT's BUG-SQM-005 wording: "Generated
  offline because <reason>" + retry/diagnostics link.
- N3. `todayStats`/`personaStats` full-scan (audit gap #10) interacts
  with the new diagnostics: per-beat aggregation is cheap today, but
  do NOT log per-fallback rows into SQLite (write amplification on
  every 45s beat) — keep in-memory counters, persist only daily
  rollups if needed.

## 5. Unified bug list (merged, deduped)

- UB-01 HIGH — Readiness gap: probe-OK ≠ chat-OK (C1). Fix: single
  shared client builder (R3) + real minimal-chat validation step in
  Settings ("Validate inference", not just "Check").
- UB-02 HIGH — Unconditional silent fallback (C4). Fix: inference
  policy modes (Strict = surface FAILED event, no pool fill; Hybrid =
  pool with offline badge; Offline = pools by choice) + state machine
  mapped onto existing error classes (Connection/Auth/RateLimit/Parse
  + LOCAL_* + OFFLINE).
- UB-03 HIGH — Local GGUF excluded from ambient (C2). Fix: chain
  cloud → local (only if a model is downloaded AND ambient-local is
  enabled) → pools; revive + test `tryLocalChat`; document
  battery/RAM cost and default (propose default ON when a local model
  exists, since local-first is the brand).
- UB-04 MEDIUM — 429 storms (C5). Fix: exponential backoff +
  per-provider cooldown + ambient beat skipping while cooled (with
  visible "cooling down" status, not fake posts).
- UB-05 MEDIUM — Icon foreground broken (N1). Fix: regenerate with
  centered geometry + per-density render verification.
- UB-06 MEDIUM — Pools too small/generic (C3). Fix (safety net only,
  after UB-02): 3–5× more lines + persona-vibe templates + offline
  badge; never a substitute for live inference.
- UB-07 LOW — Creator offline fallback masks config failure (N2).
  Fix: reasoned message + retry link.

## 6. Unified roadmap (merged phases, priorities)

- Phase A — Trustworthy inference (P0): UB-01 (shared builder +
  real validation), UB-02 (policy modes + state machine + no silent
  fill), UB-04 (backoff/cooldown), UB-03 (local chain behind
  setting), integration tests for the uncovered half of the matrix,
  one-day fallback-cause aggregation to rank real failures (R1).
- Phase B — Real personas (P1): structured persona state (mood,
  interests, memories, relationships, goals fed into prompts —
  ChatGPT P1), explicit relationship graph driving replies/likes/DMs
  (killer-feature candidate), multi-turn conversation chains with
  memory of the thread (ChatGPT P3), persona activity schedules
  visible in #tslp (P5), memory approvals kept frictionless.
- Phase C — Living island (P1): world events that change persona
  behavior (P6), spawn-with-story, persona discovery with reasons
  (P8), Gazette as real model-written digest, living notifications
  with context (P10).
- Phase D — Intelligent feed (P2): Island Algo natural-language
  controls (P4), user-described custom feeds (P7), topic
  intelligence.
- Phase E — Polish (P3): UB-05 icon, UB-07 creator wording, DM image
  send (schema-ready), affinity/relationship UI, onboarding auto-route
  + copy, muted-word scopes, iOS shell, remaining LOWs, hardening.
- Explicitly NOT building: monetization/ads/Spaces/federation/
  payouts/video infra/enterprise analytics (both transcripts agree).

## 7. Open questions for planning mode

1. Strict mode default? (Proposal: Hybrid default, Strict opt-in —
   Strict on a failing provider means an empty-feeling island.)
2. Local-ambient default ON when a GGUF is downloaded? (Battery/RAM
   vs brand promise.)
3. Offline badge wording (user-visible honesty vs immersion)?
4. Backoff parameters (base delay, max cooldown, beat-skip policy)?
5. Which Phase B item first: relationship graph or structured persona
  state? (Graph drives behavior; state drives voice.)
6. Icon: regenerate programmatically now, or wait for the ChatGPT-
  session image drop the user mentioned?

*End of REPORT002. Consensus + both transcripts + independent local
verification, 2026-10-07. Next: planning-mode question rounds, then
sprints, then build mode.*
