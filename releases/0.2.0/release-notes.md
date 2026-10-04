# Release Notes — 0.2.0

## Highlights
- Added separate configurable endpoints/keys for chat, caption, and image models.
- Fixed Capacitor Filesystem base64 write/read error during model downloads.
- Replaced placeholder HF catalogue with verified public GGUF repositories.
- Bumped application version to `0.2.0`.

## Model Routing
- Settings now exposes Chat, Caption, and Image endpoint + API key fields.
- `ModelClient` supports chat, caption, and image generation paths.
- App routes model usage by feature: chat for personas/DMs, caption for vision prompts, image for post image generation.

## Bug Fixes
- Fixed `unsupported encoding provided: base 64` error when downloading models on native.
- Fixed `listRepoGgufs()` URL encoding for HF tree API.
- Fixed catalogue deduplication against downloaded repos.

## Verification
- `npm run check`: clean
- `npm test`: 99 passed
- `npm run test:e2e`: 4 passed
- `npm run build`: succeeds
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## Known Limitations
- Image generation stores metadata only; real image fetch/save is not implemented yet.
- Native append still uses in-memory buffer per chunk; acceptable for current model sizes.
