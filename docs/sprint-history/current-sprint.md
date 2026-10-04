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

