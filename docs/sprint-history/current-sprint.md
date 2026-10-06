# Current Sprint — Sprint 8 multimodal/sidecar support

## Scope

Multimodal model pipeline, image generation sidecar, image captioning sidecar,
friend-first reply simulation wiring, and completion of empty API modules.

## State

- Implementation: in progress.
- Automated checks: `npm run check`, `npm test`, `npm run test:e2e`, and
  `npm run build` are green.
- Automated verification confirmed: typecheck passed, 99
  Vitest tests passed, 4 Playwright tests passed, and the production build
  passed.

## Latest fixes — 2026-10-03

- `src/lib/config.ts`: added `imageGenEndpoint`, `captionEndpoint`, and feature
  flags `enableImageGeneration` / `enableCaptioning`.
- `src/native/secrets.ts`: added secure storage for image-gen and caption
  endpoints.
- `src/lib/api/secrets.ts`: exposed getters/setters for sidecar endpoints.
- `src/lib/api/bootstrap.ts`: wires sidecar endpoints into `ModelClient`.
- `src/lib/api/model-client.ts`: added `captionImage()` and `ModelClientOptions`
  for sidecar routing; preserves existing chat behavior.
- `src/lib/api/vision.ts`: implemented `describeImage()` with offline fallback.
- `src/lib/api/image.ts`: implemented `generateImage()` with placeholder fallback.
- `src/lib/sim-engine.ts`: implemented `replyToUserPost()` with friend-first
  ordering and offline fallback.
- `src/lib/api/newspaper.ts`: implemented lightweight link unfurling.
- `src/lib/api/opengraph.ts`: implemented OpenGraph metadata extraction.
- `src/lib/api/persona-generator.ts`: implemented persona synthesis via model
  endpoint with offline fallback.
- `src/lib/api/posts.ts`: removed `Not implemented` stub; post mutations go
  through `Store` directly.
- `src/lib/api/index.tsx`: added `client` to `ApiContext`; added `useModelClient`.
- `src/App.tsx`: passes `client` into `ApiProvider`.
- `src/pages/SettingsPage.tsx`: added Image Generation Endpoint and Caption
  Endpoint configuration fields.
- `src/pages/ComposePage.tsx`: triggers non-blocking `replyToUserPost` after
  successful post creation.

## Verification

1. `npm run check` — passed.
2. `npm test` — passed: 3 files, 99 tests.
3. `npm run build` — passed.
4. `npm run test:e2e` — passed: 4 Playwright tests.

## Sprint status: IN PROGRESS

Multimodal routing and sidecar wiring are implemented. Remaining work:
- Manual browser verification of image/caption settings.
- Optional: wire image generation into Composer/PostCard flows.
- Optional: integrate newspaper/OG extraction into feed links.

{"timestamp":"2026-10-05T15:07:00.968Z","sprint":"fixbatch","file":"src/lib/api/model-client.ts","action":"multi-path discovery + model id wiring"}
{"timestamp":"2026-10-05T15:07:01.138Z","sprint":"fixbatch","file":"src/lib/api/models.ts","action":"instant catalogue, lazy GGUF enrich"}
{"timestamp":"2026-10-05T15:07:01.301Z","sprint":"fixbatch","file":"src/pages/ModelsPage.tsx","action":"loading/empty states, overflow fix, testids"}
{"timestamp":"2026-10-05T15:07:01.486Z","sprint":"fixbatch","file":"src/pages/SettingsPage.tsx","action":"auto-discovery, kilo preset, test chat, local run"}
{"timestamp":"2026-10-05T15:07:01.628Z","sprint":"fixbatch","file":"src/pages/FriendPage.tsx","action":"auto-greeting + auto-reply"}
{"timestamp":"2026-10-05T15:07:01.775Z","sprint":"fixbatch","file":"src/native/inference.ts","action":"browser-safe local runner"}
{"timestamp":"2026-10-05T15:07:02.069Z","sprint":"fixbatch","file":"tests/e2e/app-exploration.spec.ts","action":"usability bug-hunt spec"}
{"timestamp":"2026-10-05T15:07:02.459Z","sprint":"fixbatch","file":".agents/verify-release.js","action":"working release gate + version 1.0.3"}
{"timestamp":"2026-10-05T15:22:38.918Z","sprint":"release-1.0.4","file":"android/build.gradle","action":"pin llama plugin to installed NDK 28"}
{"timestamp":"2026-10-05T15:42:29.593Z","sprint":"release-1.0.5","file":"android/app/build.gradle","action":"signed release config + 1.0.5"}
{"timestamp":"2026-10-05T16:15:21.652Z","sprint":"release-1.0.7","file":"src/native/files.ts","action":"base64 + appendFile download fix"}
{"timestamp":"2026-10-05T17:08:11.248Z","sprint":"release-1.0.8","file":"src/lib/api/model-client.ts","action":"CapacitorHttp native bridge for endpoint traffic"}
{"timestamp":"2026-10-05T19:01:23.166Z","sprint":"release-1.0.9","file":"src/lib/api/activity.ts","action":"island liveliness engine + follow seed"}
{"timestamp":"2026-10-05T20:24:52.118Z","sprint":"release-1.0.10","file":"src/lib/api/activity.ts","action":"live ambient client + rich pools"}
{"timestamp":"2026-10-05T21:28:03.665Z","sprint":"release-1.0.11","file":"src/native/db.ts","action":"AS-alias projection + ALTER support"}
{"timestamp":"2026-10-06T06:52:20.023Z","sprint":"release-1.0.12","file":"src/components/ProviderSettings.tsx","action":"provider templates + kind pickers"}
{"timestamp":"2026-10-06T08:23:56.005Z","sprint":"release-2.0.0","file":"masterplanilandsmigration.md","action":"hybrid migration plan + sprints A-H"}
