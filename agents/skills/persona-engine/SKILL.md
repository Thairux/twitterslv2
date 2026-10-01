# persona-engine — Personas & Friend Invariant

Load before touching personas, seeds, sim-engine, or friend UI.

## Rules
- Cap 50 personas, starter 10: 1 friend, 2 fans, 3–4 peers, 1 meme,
  1–2 trolls, 1 news (v1 conceptmap mix).
- `FRIEND_ID` always exists, always kind, replies FIRST (`reply_order = 0`)
  on user posts, never passes the troll-line guard.
- Persona memory: train-once + consent; embedding refs only; approvals bind
  exact revisions (`pending_memories` → `memories` with `consented=1`).
- Weekly spawn via `world.ts activeSubset`; never auto-delete user content.
- Port v1 `lib/domain/persona.ts` verbatim in Sprint 3 — behavior parity first,
  improvements only via gap-critique + new sprint.
