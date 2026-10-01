# architecture — Four Layers, Inward Only

```
UI (src/pages, src/components)
 └─▶ App (src/lib/api — use-cases, orchestration, Zod validation)
      └─▶ Domain (src/lib/domain — pure TS)
           └─▶ Infra (src/store, src/native — SQLite, secrets, files, notify)
```

## Rules
- Dependency flows inward only. UI never imports `src/store` or `src/native`;
  domain never imports Capacitor, SQLite, or fetch.
- Every Capacitor plugin sits behind `src/native/*` with a web fallback that
  exposes the IDENTICAL interface (v1 lesson: no `if (Platform.OS)` in callers).
- Frontend holds no authority: the api layer revalidates every command.
- New files must pass `agents/rules/03-new-file-gate.md` (why / what breaks /
  which doc justifies).
