# Sprint v3-S6 — Platform: console, transparency, data, a11y, feed (→ 3.0.0)

## Goal
Sim console, prompt transparency, backup restore, storage, benchmark,
full a11y, feed mechanics.

## Changes
- #tslp Sim console tab: heartbeat interval (agent_config,
  default 45s), Pause island flag, manual spawn with theme, trigger
  world event (records + injects into next-beat prompts).
- Transparency: prompt ring buffer (last 30 prompts, #tslp tab);
  persona debugger (chat-as-persona with visible system prompt);
  reply-as-persona composer (explicitly labeled writes).
- Settings/Data: backup import (plain JSON, smart merge newer-wins
  with preview counts); storage manager (per-category blob sizes +
  prune media).
- Models hub: per-model benchmark (tokens/sec, standard prompt).
- A11y: font-size setting (CSS var), reduce-motion honored, DM TTS
  with per-role pitch/rate, haptics toggle (navigator.vibrate).
- Feed: pull-to-refresh (touch) + cursor pagination (30/page by
  created_at) in rankFeed path + UI "Load more".
- Tests: merge test, prompt-log test, pagination test, a11y flag test.

## Acceptance
- Console drives sim; prompts inspectable; import merges; prune
  works; benchmark scores; a11y flags effective; pages load; green.
