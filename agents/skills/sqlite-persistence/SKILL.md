# sqlite-persistence — SQLite Is Truth

Load before touching `src/store/`, `src/native/db.ts`, or `src/lib/api/db.ts`.

## Rules
- One database, one writer path: `src/native/db.ts` (adapter) →
  `src/lib/api/db.ts` (wrapper) → use-cases. Nothing else opens the DB.
- Web fallback (preview) implements the same `DbAdapter` interface; no
  platform branches in callers.
- Migrations are additive-only, applied in transactions, version-tracked.
  Baseline `src/store/schema.sql` already includes the v1 comma fix — do not
  "re-fix" it; add new deltas in `migration-defs.ts`.
- Statement splitting must stay comment/string-aware (`domain/sql.ts`).
- Wrap multi-row writes in transactions; validate inputs with Zod at the
  api boundary, not in SQL.
