# ocdemo — TSL UI Truth

Clickable spec for TwitterSL v2 screens. Ported from the v1 AgyDemo
(`../agydemo/`, frozen archive — do not edit) with fixes and tweaks.

## Fixes vs the original (Antigravity lessons)
- Brand `AGY` → `TSL` everywhere: `<title>`, top-left logo, all screens.
- Per-screen titles: `TSL — Feed|Thread|Me|Notifications|Messages|Friend|
  Models|Settings`. (`feed.html` remains a redirect stub to `index.html`.)
- `localStorage` keys namespaced `agydemo-*` → `ocdemo-*`
  (theme, endpoint, apikey) so the demo never collides with the app (`tsl-*`).
- `models.html`: bottom tabbar no longer highlights `Me` (was `active` by bug);
  a hub page highlights no tab.

## Tweaks
- `models.html` IndexedDB name kept as `twittersl-models` (shared model cache
  semantics carry to `src/native/files.ts` in Sprint 5).
- Tokens unchanged (dark: black/cyan + magenta; light: yellow/white/black +
  magenta; 3px borders, 0 radius, hard shadows, mono type).

## Files
`index.html` (Feed) · `feed.html` (redirect stub) · `post.html` (Thread) ·
`profile.html` (Me) · `notifications.html` · `dms.html` (inbox) ·
`friend.html` (1:1 + Friendship Meter) · `models.html` (HF hub) ·
`settings.html` · `assets/avatar-*.svg`.

## Contract for React port
Tokens + shell + layout copy verbatim; the shared shell (header/tabbar) must
be ONE component with brand passed once (the v1 bug class was N copies of the
string). See `agents/skills/demo-source-of-truth/`.
