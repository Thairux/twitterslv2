# Sprint v3-S3 — Real personas: graph + state (→ 3.0.0 Phase B)

## Goal
Graph-led: explicit relationships drive behavior; structured persona
state drives voice; schedules + conversation memory.

## Changes
- Schema v20: `relationships(a_id, b_id, rel [FRIEND|FOLLOWS|LIKES|
  DISLIKES|ADMIRE|RIVAL|DEBATES|KNOWS], weight, updated_at,
  PK(a_id,b_id))`, `persona_state(persona_id PK, state_json, updated_at)`
  (mood, interests[], goals[], active_hours{wake,sleep}, topics[]).
- Seed: founder graph (Mimi↔coral FRIEND, reef RIVAL meme, etc.).
- Prompt builders consume state+graph: reply/like/DM/follow weights;
  multi-turn context (last 2 ancestors) in reply prompts.
- Ambient respects sleep windows (posts only; DMs queued as missed? —
  decision: skip silently, log).
- Memory approvals: surface pending count in #tslp header (frictionless
  path to existing approval UI).
- Tests: graph weight test, prompt-builder test (state included),
  sleep-window test.

## Acceptance
- RIVAL personas argue, FRIENDs cluster (observable in seeded e2e);
  prompts contain state+graph; sleepers silent at night; check green.
