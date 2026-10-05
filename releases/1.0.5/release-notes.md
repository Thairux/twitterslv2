# Release 1.0.5 — Signed release (installable)

## Highlights
- Same app code as 1.0.4, now **signed** — installs on-device instead of
  "app appears to be invalid" (that error was the missing signature).
- Signed with `twittersl-release.keystore` (CN=peter thairu muigai).
  Keystore + passwords live in gitignored `android/keystore.properties`;
  without that file the build falls back to unsigned.

## Verification
- `npm run check` clean
- `npm run test` green
- `npm run test:e2e` green
- `npm run build` succeeds
- `assembleRelease` BUILD SUCCESSFUL (signed, all 5 plugins incl. llama native)
- `apksigner verify` pass
- `npm run release:verify` pass
- Installed on-device via `adb install`

## Artifact
- `releases/1.0.5/twitterslv2-1.0.5-release.apk` (signed release build)
