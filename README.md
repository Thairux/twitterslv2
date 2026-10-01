# TwitterSL v2 (TSL)

Local-first fake-Twitter island simulation: one real user, all other users AI.
Capacitor + Vite + React + TypeScript port of v1 (`../twittersl`, which is Expo).

## Status
Implemented through the Sprint 7 models/endpoint surface. The active gate is
manual verification of catalogue loading, GGUF file enumeration, download
progress/cancellation/resume, and Downloads cleanup. See
`docs/inprogress/COPILOT_HANDOFF.md` and `masterplan.md`.

## Quickstart
```sh
npm install
npm run dev        # browser preview on :5173
npm run check      # typecheck
npm run test       # unit + integration
npm run test:e2e   # Playwright browser flows
npm run build
npm run cap:sync   # after build, wire native shells
```

## Docs
- `masterplan.md` — phases, sprint scope, structure, and current status
- `docs/` — architecture, backend, frontend, features, domain, getting-started
- `agents/` — project-scoped skills, rules, hooks (source of truth)
- `alldemos/ocdemo/` — UI truth (TSL-branded port of the v1 AgyDemo)
- `alldemos/agydemo/` — archived v1 demo, untouched reference

## v1 lessons baked in
Web/native divergence (llama.rn null on web, SecureStore vs IndexedDB) is solved
by `src/native/*` adapters with web fallbacks. No prototype fake data (`@bramble`
tweets) may enter `src/`. Migrations are additive-only.
