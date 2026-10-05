# Release 1.0.4 — Full native build with on-device inference

## Highlights
- Same app code as 1.0.3, now packaged as a **full** release APK that includes
  the `llama-cpp-capacitor` native module (on-device GGUF inference works;
  1.0.3's APK excluded it).
- Build fix: the plugin pins `ndkVersion 29.0.13113456`, which is not
  installed and not offered as a downloadable package. `android/build.gradle`
  now forces the installed NDK `28.2.13676358` for that module (no
  `node_modules` edits), and the Android SDK license hashes were accepted
  locally (equivalent of `sdkmanager --licenses`).

## Verification
- `npm run check` clean
- `npm test` green
- `npm run test:e2e` green (incl. `app-exploration` usability/bug-hunt spec)
- `npm run build` succeeds
- `assembleRelease` BUILD SUCCESSFUL with all 5 Capacitor plugins
- `npm run release:verify` pass

## Artifact
- `releases/1.0.4/twitterslv2-1.0.4-release-unsigned.apk` (unsigned release build;
  sign with the release keystore before store distribution)
