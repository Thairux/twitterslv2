# model-provider — Model Endpoint Client

Load before touching `src/lib/api/model-client.ts`, `hf.ts`, `models.ts`.

## Contract (see rules/05)
- Setting is named **Model Endpoint URL** (+ API key). Never `Glimmer Endpoint`
  (v1 terminology drift — do not regress).
- Endpoint-first with offline fallback: every generation records attempt
  history + `via: endpoint | offline`.
- Timeouts, auth failures, malformed responses, rate limits: handled, surfaced
  as typed errors — never silent empty success.
- Offline pools (≤140ch) are deterministic and clearly flagged `[*]`-style in UI.
- No cloud egress or spend without explicit user approval.
- HF search/list/download: live API with graceful offline catalogue fallback;
  blobs go to `src/native/files.ts`, DB keeps paths + sizes.
