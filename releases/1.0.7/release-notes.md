# Release 1.0.7 — Kilo preset correction + FAB edge fix

## Bug fixes (found during on-device exploration of 1.0.6)
- **Kilo preset used the wrong model id**: the gateway expects
  `stepfun/step-3.7-flash:free` (OpenRouter-style), the preset filled
  `step-3.7-flash:free`. Preset, placeholder, and help text corrected.
- **Compose FAB half off-screen on phones**: `right: calc(50% - 225px + 16px)`
  goes negative when the WebView viewport is narrower than 450px. Now
  clamped with `max(16px, …)` so the button is always fully visible/tappable.

## Verification
- `npm run check` clean
- `npm test` green
- `npm run test:e2e` green
- `npm run build` succeeds
- `assembleRelease` BUILD SUCCESSFUL (signed, all 5 plugins incl. llama native)
- `apksigner verify` pass (CN=peter thairu muigai)
- `npm run release:verify` pass
- Installed on-device via `adb install`

## Artifact
- `releases/1.0.7/twitterslv2-1.0.7-release.apk` (signed release build)

## Known exploration notes
- Feed, profile, tab navigation verified on-device via screenshots; no
  WebView console errors in logcat.
- Full tap-through (compose post, model search/files, settings discovery
  against the live Kilo gateway) pending a quiet moment on the device.
