# Sprint v3-S5 — Social depth (→ 3.0.0 Phase C/D)

## Goal
DM depth, collections, share PNGs, self analytics, OG badges.

## Changes
- Schema v22: `dm_reactions(dm_id, persona_id, emoji,
  PK(dm_id,persona_id))`, `posts.reply_control` was v18 (see S7 —
  implemented here if S7 order shifts; canonical: v18),
  `dms.reply_to_id NULL`, `bookmark_folders(id PK, name)`,
  `bookmark_folder_items(folder_id, bookmark_id)`,
  `pinned_threads(thread_id PK)`, `persona_badges(persona_id PK,
  badge)` (seed OG badges for founders).
- FriendPage: emoji reaction picker, quote-reply (reply_to render),
  per-thread search filter box.
- DMsPage: pins section + custom labels (agent_config map).
- Share: canvas-rendered branded post PNG (plate + body + author) via
  share/download.
- ThreadPage own-post stats: views/likes/replies per-day strip
  (JS-grouped).
- Badges (✓ OG) in PostCard/PersonaPage/#tslp.
- Tests: reactions test, quote-reply test, folders test, pins test.

## Acceptance
- React/quote/search work per thread; folders + pins persist; PNG
  renders; stats strip correct; badges visible; check green.
