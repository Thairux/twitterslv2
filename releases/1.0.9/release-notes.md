# Release 1.0.9 — The island comes alive

## Root causes fixed
- **Posts got zero responses**: `ComposePage` called `replyToUserPost()` but
  never persisted the returned replies — they were computed and thrown away.
  New `src/lib/api/activity.ts` persists friend-first replies + likes on a
  seconds-scale stagger after every post.
- **Friend systems pointed at a ghost**: domain `FRIEND_ID` is
  `persona-friend` (Mimi) but seeds never included her — so friend pings,
  greetings, and post replies silently no-op'd. Mimi is now seeded (51
  personas total), and seeding backfills missing personas + follows on old
  installs.
- **Like counts never moved**: reactions toggled but `posts.likes` was never
  recomputed. Toggles now recount from the reactions table.
- **Caption/image catalogue was uninstallable**: SDXL/BLIP ship no GGUFs.
  Replaced with live-verified GGUF repos: `moondream/moondream2-gguf`,
  `ggml-org/moondream2-20250414-GGUF`, `xtuner/llava-llama-3-8b-v1_1-gguf`,
  `cjpais/llava-1.6-mistral-7b-gguf` (+ 4 chat models).

## Features
- Search is a first-class tab (was only reachable by URL).
- "Who to follow" suggestions + Follow buttons in Search → Personas.
- 51 seeded personas (50 islanders + Mimi); user follows Mimi + 4, Mimi + 6
  follow back; world cap raised 50 → 60 so weekly spawns keep arriving.
- Heartbeat: personas post, reply, like, and DM every 45s (first beat at 8s).
- Weekly Spawn / Friend Ping now report the island headcount as proof.
- Neobrutalist Like/Repost/Save buttons with active states; tappable like
  counts reveal who liked; new `followers` table (migration v10).

## Verification
- `npm run check` clean; `npm test` green; `npm run test:e2e` green.
- `assembleRelease` BUILD SUCCESSFUL (signed); `apksigner verify` pass.
- `npm run release:verify` pass; installed on-device and exercised via adb:
  posted, watched replies/likes land, opened likers, followed suggestions.

## Artifact
- `releases/1.0.9/twitterslv2-1.0.9-release.apk` (signed release build)
