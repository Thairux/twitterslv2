# Architecture Overview

TwitterSL v2 is a web-first Capacitor app. One Vite build produces `dist/`,
which is consumed by the browser and the Android/iOS shells.

## Dependency direction

The enforced direction is `UI → App → Domain/Infra`; domain code remains pure.

- **UI** — `src/pages/`, `src/components/`: React rendering and user events.
- **App** — `src/lib/api/`: use-cases, orchestration, validation, fallbacks,
  and typed service/store interfaces consumed by the UI.
- **Domain** — `src/lib/domain/`: pure TypeScript for persona, post, social,
  world, engine, and SQL statement helpers. It must not import Capacitor,
  SQLite, `fetch`, storage, timers, or other effects.
- **Infra** — `src/store/`: SQLite schema, additive migrations, seeds, and
  persistence; `src/native/`: database, files, secrets, notifications, and
  background adapters with web fallbacks.

`src/lib/api/` is the only application boundary allowed to coordinate
`src/store/` and `src/native/`. Capacitor imports belong behind
`src/native/*`. SQLite is the source of truth; filesystem/IndexedDB holds
blobs only; endpoint URLs and keys stay in Preferences/secure storage.

Existing legacy surfaces still have a small number of type-only domain imports
from pages and direct endpoint/HF calls in Settings/Models. Treat those as
known migration debt: do not copy the pattern into new code, and move it
behind an App-layer use-case when that surface is next changed.

## Current implementation map

- Boot and providers: `src/App.tsx`, `src/lib/api/bootstrap.ts`,
  `src/lib/api/index.tsx`
- Social/feed/profile/DM use-cases: `src/lib/api/store.ts`,
  `social-store.ts`, and `dm-store.ts`
- Models and HF catalogue/downloads: `src/lib/api/models.ts`, `hf.ts`,
  `src/pages/ModelsPage.tsx`
- Native/web persistence: `src/native/db.ts`, `files.ts`, `secrets.ts`
- Screens: `src/pages/`; shared UI: `src/components/`; tokens/themes:
  `src/styles/`

The implementation is broader than the original scaffold plan. The remaining
Sprint 7 gate is manual catalogue/download verification followed by the
standard check, test, E2E, and build commands. Any future UI that needs
network or persistence must add an App-layer use-case instead of importing
`fetch`, Capacitor, SQLite, or filesystem adapters directly.

Diagrams: `../diagrams/`.
