# definition-of-done — Sprint Gate

Load before declaring ANY sprint complete. All gates must pass:

1. Scaffold/files: every file the sprint promised exists at its listed path.
2. Scope match: touches only files listed in `masterplan.md` for this sprint.
3. Unit tests written + passing (domain ≥ 90%).
4. Integration tests passing (both storage adapters where relevant).
5. E2E/golden-path unaffected (run, or state why N/A).
6. `npm run check` clean; no new lint errors.
7. Invariants intact (friend-first, secrets, consent, append-only schema, TSL brand).
8. Demo parity: touched screens still match `alldemos/ocdemo/`.
9. Docs: `docs/sprint-history/sprint-{N}.md` written; HANDOFF updated if needed.
10. Hook log: `post-file-change-hook.js` row appended (or batched at sprint end).
11. No unresolved TODOs left in sprint files without a follow-up sprint ID.

One gate fails → sprint is not done. Say so explicitly.
