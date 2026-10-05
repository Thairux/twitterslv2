# Release 1.0.6 — Phone-reported bugs fixed

## Bug fixes (found by testing 1.0.5 on-device)
- **Model downloads failed with "Unsupported encoding provided: base64"**:
  the app passed `encoding: 'base64'` to the Filesystem plugin, which only
  accepts text charsets. Binary read/write now omits `encoding` (base64
  round-trip), chunk appends use the O(1) `appendFile` API instead of
  rewriting the whole file per 1MB chunk, and fresh downloads delete stale
  blobs first so files can't double in size.
- **Kilo gateway (https) couldn't be checked**: Check only probed `/health`.
  It now probes `/v1/models` → `/models` → `/health` → base, reports which
  answered, surfaces 401 (missing key) explicitly, and normalizes the URL
  (trims, defaults to `https://`, strips trailing slashes).
- **"Model endpoint empty" on test chat / dead DMs**: Settings and Friend
  replies used the app-boot client, stale after endpoint edits. Both now
  build a live client from current settings; test/check auto-persist the
  endpoint first.
- **No way to post from the UI**: the feed had no compose entry point.
  Added the floating `+` button per `alldemos/ocdemo/index.html` (demo parity).

## Verification
- `npm run check` clean
- `npm test` green (incl. new normalize/probe tests)
- `npm run test:e2e` green (incl. FAB reachability assertion)
- `npm run build` succeeds
- `assembleRelease` BUILD SUCCESSFUL (signed, all 5 plugins incl. llama native)
- `apksigner verify` pass (CN=peter thairu muigai)
- `npm run release:verify` pass
- Installed on-device via `adb install` + explored via adb (UI dumps,
  screenshots, logcat sweep)

## Artifact
- `releases/1.0.6/twitterslv2-1.0.6-release.apk` (signed release build)
