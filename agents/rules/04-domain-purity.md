# 04 — Domain Purity

`src/lib/domain/` is pure TypeScript: no `@capacitor/*`, no SQLite, no fetch,
no `localStorage`, no timers. All effects enter through api-layer arguments.
Port v1 domain files verbatim first; behavior changes go through gap-critique.
Unit tests must run in plain Node (vitest `environment: node`).
