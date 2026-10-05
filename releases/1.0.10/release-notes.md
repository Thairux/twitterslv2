# Release 1.0.10 — DMs, comments, honest personas, working downloads

## Bug fixes (reported from on-device testing)
- **Can't DM anyone**: Search results and suggestions showed names with no
  action. Persona rows are now tappable and open the DM thread directly
  (`/messages/:id`, covered by E2E).
- **Can't comment on posts**: threads had no composer — only Quote existed.
  Added an inline Reply box on `ThreadPage` with E2E coverage.
- **Personas posted nonsense**: offline pools were 3–6 generic lines reused
  as both posts and replies ("interesting thought" as a standalone post).
  Pools are now 12 friend replies + 20 crowd replies + 24 slice-of-life post
  starters; sim-engine's stale duplicate pools now import the single source
  of truth; model prompts carry island context and persona voice.
- **Model downloads failed ("Parent folder doesn't exist")**: chunk appends
  missed `recursive: true`, so the first chunk failed whenever `models/`
  didn't exist yet. Flag added (the exact plugin error path).
- **Ambient traffic ignored your settings**: background replies/posts/DMs
  used the boot-time client forever. They now resolve a live client from
  stored endpoint/key/model, so Kilo answers when configured, offline pools
  otherwise.

## Verification
- `npm run check` clean; `npm test` green; `npm run test:e2e` green (social
  spec now covers comment + DM-open flows).
- `assembleRelease` BUILD SUCCESSFUL (signed); `apksigner verify` pass.
- `npm run release:verify` pass; installed on-device and exercised via adb.

## Artifact
- `releases/1.0.10/twitterslv2-1.0.10-release.apk` (signed release build)
