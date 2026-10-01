# dm-engine — DMs & Friendship Meter

Load before touching DM/friend code.

## Rules
- Thread IDs: `user:<other>` (1:1 + groups) or `agent:<a>:<b>` (persona↔persona).
- Read markers (`dm_reads`) + typing indicators; photos via files adapter.
- Friendship Meter is affinity-backed (`personas.affinity`) — a display of a
  real number, never a hardcoded 85%.
- Follow/mute/report/block live in the api layer with Zod validation.
