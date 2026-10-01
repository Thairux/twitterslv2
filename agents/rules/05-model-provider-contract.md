# 05 — Model Provider Contract

- Setting name: **Model Endpoint URL** (+ API key). Never "Glimmer Endpoint".
- Endpoint-first, offline fallback; every generation stores attempt history +
  `via` flag. Offline output is deterministic and UI-flagged.
- Typed errors for timeouts/auth/malformed/rate-limit; never silent success.
- No cloud egress or spend without explicit user approval.
- Model/image blobs → `src/native/files.ts`; DB keeps paths only.
