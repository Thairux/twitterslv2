# Sprint v3-S4 — Living island (→ 3.0.0 Phase C)

## Goal
Stories, identity, arrivals, model Gazette, grouped notifications.

## Changes
- Schema v21: `stories(id PK, author_id, body, image_path, created_at,
  expires_at)`, `story_views(story_id, viewer_id, viewed_at,
  PK(story_id,viewer_id))`.
- Feed stories strip (24h filter, avatar rings, viewer list, story
  reply → DM). Persona stories from ambient; user stories via compose
  entry.
- Identity: `PersonaAvatar` SVG identicon (seed hash geometry +
  per-persona accent) replaces initials everywhere (cards, inbox,
  #tslp, comments).
- Arrival ceremony: spawn/creator writes arrival post + Gazette mention
  + follow suggestion + greeting DM.
- Gazette: model-written digest when live (top threads/fights/
  arrivals), honest list + note when not.
- Notifications grouped (`Name + N others …` with expand).
- Tests: expiry test, avatar determinism test, arrival test, grouping
  test.

## Acceptance
- Stories expire, views tracked, arrivals announced, Gazette reads like
  a gazette, groups expand; check green.
