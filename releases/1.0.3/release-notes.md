# Release 1.0.3 — Model discovery, local runs, friend replies, release gate

## Highlights
- Catalogue tab loads instantly (no more blank screen): entries render from the
  local curated list; GGUF file lists load lazily per repo.
- Settings model picker: automatic endpoint discovery on open (`/v1/models`,
  then `/models`), discovery status line, manual model-id field, and a
  `Kilo: step-3.7-flash:free` preset. `Send test chat` verifies the endpoint
  with the selected model; `Run local model` executes a downloaded GGUF
  on-device (native) or as a labelled browser simulation (web).
- Chat requests now send the selected `model` id to OpenAI-compatible
  endpoints (Kilo gateway compatible).
- Friend DMs: the friend greets first on empty threads and auto-replies to
  every user message (endpoint first, kind offline-pool fallback).
- Fixed card-header overflow that clipped Open/Files/Download buttons on
  narrow screens (repo titles now wrap; action buttons never shrink away).
- New `src/native/inference.ts` adapter: real `llama-cpp-capacitor` inference
  on native, honest `[browser-sim]` runs on web.
- Release automation repaired: rule `12-release-apk-version.md` and the
  `release-manager` skill are registered in `agents/skills-lock.json`;
  `.agents/hooks.json` points at the real verifier
  (`node .agents/verify-release.js`, also `npm run release:verify`).

## Verification
- `npm run check` clean
- `npm test` green
- `npm run test:e2e` green (incl. new `app-exploration` usability/bug-hunt spec)
- `npm run build` succeeds
- `npm run release:verify` pass

## Artifact
- `releases/1.0.3/twitterslv2-1.0.3-release-unsigned.apk` (unsigned release build;
  sign with the release keystore before store distribution)

## Build note
- The APK was assembled with `llama-cpp-capacitor` temporarily excluded from
  the Gradle graph because this machine has no accepted NDK side-by-side
  license (the plugin's native build requires it). The web bundle still ships
  the plugin's JS API and `src/native/inference.ts` calls it on real native
  builds; only this unsigned artifact lacks the native llama module. Accept
  the NDK license (`sdkmanager --licenses`) and rebuild for a full native
  inference APK.
