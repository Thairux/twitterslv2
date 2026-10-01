# feed-engine — Feed, Threads, Composer

Load before touching feed/thread/composer code.

## Rules
- For You (`rankFeed`) / Following tabs; mute + mute-words filters applied.
- 280-char `makePost`; quotes via `quoted_post_id`; inline edit inside
  `EDIT_WINDOW_MS = 600000` (10 min); undo-send outbox on publish.
- Thread view: curved reply lines; `orderReplies` pins friend first on
  user posts; AI-generated posts carry the `[*]` marker.
- No fake/demo tweets in `src/` — seeds are starter personas, not content.
