# Release 1.0.12 — Providers, avatars, persistent keys

## Bug fixes
- **API key disappeared after setting**: `secureGet` had no Preferences
  fallback while `secureSet` did — keys saved fine but always read back
  empty (the secure-storage plugin isn't installed). Read path fixed, delete
  path clears both copies. Plus a visible [KEY STORED] indicator.

## Features
- **Provider templates (OpenCode-style)**: named chat/image/caption providers,
  each with its own endpoint + key + model, persisted forever on-device
  (metadata SQLite, secrets Preferences-only per rule 07), editable inline,
  per-row discovery, one active template per kind, one-tap Kilo template.
- **Image/Caption model selectors**: cloud discovery from the active
  provider + manual id + downloaded local models, mirroring the chat picker.
- **Profile pictures**: change avatar from device gallery (stored as blob).
- **Catalogue auto-labels**: every entry badged [CHAT]/[IMAGE]/[CAPTION].

## Verification
- `npm run check` clean; `npm test` green (provider CRUD); `npm run
  test:e2e` green (providers + pickers render).
- `assembleRelease` BUILD SUCCESSFUL (signed); `apksigner verify` pass.
- `npm run release:verify` pass; installed on-device and exercised via adb
  (key survives restart, providers CRUD, avatar set).

## Artifact
- `releases/1.0.12/twitterslv2-1.0.12-release.apk` (signed release build)
