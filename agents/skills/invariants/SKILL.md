# invariants — Non-Negotiables

1. SQLite is truth; filesystem holds blobs only (DB stores paths).
2. Domain is pure: no Capacitor/SQLite/fetch in `src/lib/domain/`.
3. Friend agent is always kind, always first reply, never troll.
4. Secrets (endpoint URL + keys) in secure storage only, never SQLite/logs.
5. Persona memory is consent-gated, approval-bound to exact revisions.
6. Simulation proposes only — never deletes user posts without approval.
7. No cloud egress or spend without explicit user approval (local-first).
8. Schema is append-only: additive migrations, never edit merged SQL.
9. Every generation carries attempt history + fallback flag (endpoint vs offline).
10. Brand is TSL — the string `AGY` must never appear in app or demo.

Violating an invariant fails the sprint regardless of feature completeness.
