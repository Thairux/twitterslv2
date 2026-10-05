# Release 1.0.8 — Kilo gateway actually works (native HTTP)

## Root cause (verified live against api.kilo.ai)
- The app's `fetch` ran inside the WebView with CORS enforced, but Kilo's
  gateway answers preflight `OPTIONS` with `204` and **zero**
  `Access-Control-Allow-Origin` headers. Any request carrying the
  `Authorization` header (i.e. every keyed request: discovery with key,
  test chat, friend replies) died in preflight with "Failed to fetch",
  while keyless simple GETs surfaced raw statuses (the confusing 404s).
- Fix: JSON API traffic (`ModelClient` probe + chat) now goes through
  CapacitorHttp on native (OkHttp — no WebView CORS/preflight), plain
  `fetch` on web. HF model downloads still stream over `fetch` untouched.

## Changes
- `CapacitorHttp` native bridge for endpoint probe + chat, with one retry
  on thrown network errors (transient mobile resets).
- "API key stored" indicator + key auto-save on Check/Test so a silently
  unsaved key is visible instead of mysterious 401s/empties.
- One polite retry on HTTP 429 (free-tier throttling) in chat.

## Verification
- Live: `GET /v1/models` + `GET /models` → 200 (399 models,
  `stepfun/step-3.7-flash:free` present); `POST /chat/completions` → 200.
- `npm run check` clean; `npm test` green; `npm run test:e2e` green.
- `assembleRelease` BUILD SUCCESSFUL (signed); `apksigner verify` pass.
- `npm run release:verify` pass; installed on-device and Check/Test-chat
  verified through the app UI with the stored key.

## Artifact
- `releases/1.0.8/twitterslv2-1.0.8-release.apk` (signed release build)
