# Sprint v3-S1 — Trustworthy inference (→ 3.0.0 Phase A)

## Goal
End silent fallback. Strict-default policy, shared client builder, real
inference validation, aggressive 429 backoff, local chain wiring.

## Changes
- New `src/lib/api/inference-policy.ts`: modes strict|hybrid|offline
  (agent_config `inference_policy`, default strict), per-provider
  cooldown registry (exponential from 2min, max 1h, beat-skip while
  cooled with visible status), in-memory fallback counters aggregated
  per provider+reason.
- New `buildLiveClient()` + `validateInference()` (minimal "Reply with
  exactly: OK" chat → READY_LIVE | AUTH/MODEL/ENDPOINT/TIMEOUT/
  RATE_LIMITED/LOCAL_READY/LOCAL_FAILURE/OFFLINE) in model-client area;
  used by Settings Check/Discover/Test, FriendPage, TslpPage creator,
  activity resolver (replaces 4 divergent constructions).
- `ModelClient.chat()`: exponential backoff on 429 (2min base) +
  cooldown marking; timeout stays 30s.
- Settings: policy selector, "Validate inference" button, cooldown +
  counters status, "Force live ambient test".
- Strict semantics: ambient produces NOTHING on failure (log + counter
  + status); direct user chats get an honest labeled diagnostic message,
  never a pool phrase. Hybrid: pools WITH offline badge. Offline: pools
  by choice (badge).
- Local chain: cloud → local (downloaded GGUF + `ambient_local` opt-in)
  → pools; revive + unit-test `tryLocalChat`.
- Tests: `tests/unit/inference-policy.test.ts` (modes, cooldown math,
  chain decisions, counter aggregation) + builder tests.

## Acceptance
- `npm run check` clean; new tests green; no pool fill in Strict;
  validation distinguishes all 8 states on demand.
