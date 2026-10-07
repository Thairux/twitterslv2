# Inference policy + readiness spec (3.0.0 Phase A)

## Modes (`agent_config inference_policy`, default `strict`)
- `strict`: ambient NEVER fills from pools. Failure → skip content +
  diagnostic counter + status. Direct user chats get an honest labeled
  diagnostic message (origin offline, clearly not persona voice).
- `hybrid`: pools allowed WITH offline badge on content.
- `offline`: pools by explicit choice (badge).

## States (mapped from existing error classes)
READY_LIVE (chat OK) · AUTH_FAILURE (401/403) · MODEL_FAILURE (400/404
on model, ParseError) · ENDPOINT_FAILURE (ConnectionError, DNS) ·
TIMEOUT (abort) · RATE_LIMITED (429×2) · LOCAL_READY/LOCAL_FAILURE
(tryLocalChat) · OFFLINE (no endpoint or mode=offline).

## Shared builder
`buildLiveClient(): ModelClient | undefined` — refreshConfig +
endpoint + key + selectedModel, one construction used by Settings
Check/Discover/Test, FriendPage, creator, ambient resolver.
`validateInference(client)` — minimal "Reply with exactly: OK" chat →
{state, latencyMs, model, error?}. Settings "Validate inference"
button surfaces all 8 states; ambient treats only READY_LIVE/
LOCAL_READY as live.

## Backoff (aggressive)
429 → exponential cooldown per provider starting 2min, doubling, max
1h. Beats skip cooled providers (visible "cooling until HH:MM" status,
no fake posts). Counters: per provider+reason in-memory, surfaced in
Settings; no SQLite per-beat writes (daily rollup only if needed).

## Local chain
cloud → local (downloaded GGUF present AND `ambient_local` opt-in) →
pools-per-mode. `tryLocalChat` revived, unit-tested with fakes.
Default: ON when a local model exists (local-first brand), toggleable.
Battery/RAM cost disclosed in Settings copy.
