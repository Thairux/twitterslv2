# Discovery 002 — Completeness Audit

Date: 2026-10-04
Scope: Read-only audit of backend, frontend, pipelines, and UI against docs claims.

## Executive Summary

The repository is implemented through Sprint 8 with a working
Capacitor 6 + React 18 + TS 5.6 + Vite 6 + SQLite + Zod stack, four-layer
architecture, seeded local-first data, and green automated gates. All core social,
DM, model/download, and settings flows are complete. Local inference is implemented
with the `llama-cpp-capacitor` native plugin and web fallbacks. The endpoint can
auto-detect available models via `/v1/models`, and the API key is optional for
local gateways such as kilo.

## Stack Verification

- `package.json` confirms: Capacitor 6, React 18, TS 5.6, Vite 6,
  `@capacitor-community/sqlite`, Zod.
- Web fallback for SQLite via `src/native/db.ts` (`WebSQLiteAdapter` + `InMemoryEngine`).
- Secrets behind `src/native/secrets.ts` with Preferences/secure-storage + web
  localStorage obfuscation.
- Local inference via `llama-cpp-capacitor@0.1.0` (native) and optional
  WebLLM/Transformers.js (web).

## Architecture Compliance

| Layer | Location | Status |
|---|---|---|
| UI | `src/pages/`, `src/components/` | Present; React-only |
| App | `src/lib/api/` | Present; Zod validation, use-cases |
| Domain | `src/lib/domain/` | Pure TS; no Capacitor/SQLite/fetch |
| Infra | `src/store/`, `src/native/` | Adapters + migrations + seeds |

Inward dependency is enforced. Historical violation in `dm-store.ts` was fixed
per `docs/improvements.md` IMP-003.

## Implemented Pipelines

### Boot / First Load
- `src/lib/api/bootstrap.ts` opens DB, wires adapters, reads secrets with
  try/catch, seeds starter personas, exposes stores + model clients to UI.
- First launch seeds 10 starter personas including guaranteed friend (`persona-friend`).
- Dead `src/lib/launch.ts` removed; seeding is centralized in `bootstrap.ts`.

### Feed / Social
- `FeedPage`, `ThreadPage`, `ComposePage` exist.
- `SocialStore` provides ranked feed, following feed, thread, search posts/personas.
- Domain `rankFeed`, `filterMuted`, `searchPosts` implemented.
- Replies ordered with friend-first on user posts (`orderReplies`, `friendReplyIsFirst`).
- PostCard renders OG link previews when URLs are detected in post bodies.

### DMs / Friend
- `DMsPage`, `FriendPage` exist.
- `DmStore` handles threads, inbox, send DM, mark read.
- Notifications page shows recent DMs as notifications.

### Models / Downloads / Catalogue / Search
- `ModelsPage` with Search, Catalogue, Downloads tabs.
- `ModelService` + `hf.ts` implement HF search, GGUF enumeration, download with
  progress, cancel, resume, cleanup.
- `listCatalogue` async, Zod-validated, deduped against downloaded repos.
- `listRepoGgufs` detects default branch (`main`/`master`) with caching.
- Catalogue includes verified chat, image, and captioning repos with `modelType`.
- `SearchPage` wired with query input and tab query-param support.

### Settings / Secrets
- `SettingsPage` for endpoint URL + optional API key, image-gen endpoint, and caption endpoint.
- `ModelClient.listModels()` auto-detects available models via `/v1/models`.
- Secrets never touch SQLite; web uses obfuscated localStorage.

### Simulation / Ambient
- `src/lib/sim-engine.ts`: `replyToUserPost()` implemented with friend-first ordering
  and offline fallback.
- `src/lib/chatter.ts`: `ambientTick`, `personaToPersonaDms`.
- `src/lib/background.ts`: resume tick stub, weekly spawn.
- `src/lib/daily.ts`, `world-events.ts`: rotating world events.

### Multimodal / Sidecar
- `src/lib/api/image.ts`: `generateImage()` with placeholder fallback.
- `src/lib/api/vision.ts`: `describeImage()` with offline fallback.
- `src/lib/api/model-client.ts`: `captionImage()`, `generateImage()`, sidecar-aware
  constructor with per-endpoint API keys.
- ComposePage has AI image-generation prompt + generate button.

### Local Inference
- `src/lib/api/local-inference.ts`: implemented local-first inference fallback.
- Native: `llama-cpp-capacitor@0.1.0` installed and synced for Android.
- Web: optional WebLLM / Transformers.js globals.
- `ModelClient` falls back to local inference when endpoint is empty or unreachable,
  then to deterministic offline pools.

### Design System / UI Shell
- `src/styles/tokens.css` and `themes.css` match `alldemos/ocdemo/` tokens.
- Phone shell, bottom tabbar, header, neobrutalist buttons/cards implemented.
- Theme toggle present.

## Resolved Gaps

| Area | Previous State | Resolution |
|---|---|---|
| `src/lib/sim-engine.ts` | Empty stub | Implemented `replyToUserPost()` with friend-first ordering |
| `src/lib/api/vision.ts` | Empty stub | Implemented `describeImage()` |
| `src/lib/api/image.ts` | Empty stub | Implemented `generateImage()` with deterministic placeholder |
| `src/lib/api/newspaper.ts` | Empty stub | Implemented lightweight link unfurling |
| `src/lib/api/opengraph.ts` | Empty stub | Implemented OG metadata extraction |
| `src/lib/api/persona-generator.ts` | Empty stub | Implemented persona synthesis with offline fallback |
| `src/lib/api/posts.ts` | Stub throws | Removed stub; post mutations go through `Store` directly |
| `src/lib/launch.ts` | Duplicate boot seed | Removed; `bootstrap.ts` is the single source of truth |
| `src/lib/api/model-client.ts` | `recordAttempt` stored `path: ''` | Now stores `artifactPath ?? 'inline'` |
| `src/lib/api/hf.ts` | Hardcoded `tree/main` | Detects default branch via HF API with caching |
| `src/lib/api/models.ts` | Chat-only catalogue | Added `modelType` + image/captioning repos |
| `src/components/PostCard.tsx` | No link previews | Renders OG preview card for detected URLs |
| `src/pages/ComposePage.tsx` | No AI image generation | Added prompt + generate button wired to `generateImage` |
| `vite.config.ts` | Missing `@` alias | Added `@` -> `/src` alias for Vite resolve |
| `src/lib/api/local-inference.ts` | Empty stub | Implemented with `llama-cpp-capacitor` + web fallbacks |
| `package.json` / Capacitor sync | No local inference runtime | Installed `llama-cpp-capacitor@0.1.0`; Android sync verified |
| Model endpoint UX | No discovery / required API key | `listModels()` auto-detects models; API key optional for kilo gateway |

## Remaining Deferred Surfaces

| Area | Status | Plan |
|---|---|---|
| `src/native/background.ts` | Stub / web no-op | Sprint 6 spike deferred; keep for native background wiring |
| iOS shell | Platform not added | Run `npx cap add ios` when Xcode is available |

## Test Coverage

- Unit: `tests/unit/domain.test.ts` covers persona, post, social, world, sql.
- Integration: `tests/integration/storage.test.ts` covers web adapter contract.
- E2E: Playwright specs for golden path, feature exploration, gap validation,
  user exploration.
- Automated gates on 2026-10-04: `npm run check` clean, 99 unit tests passed,
  4 E2E passed, production build passed.

## UI Completeness

All routes listed in `src/App.tsx` render pages. Pages exist for:
Feed, Thread, Profile, Notifications, DMs, Friend, Models, Settings, Persona,
Search, Chatter, Gazette, Onboarding, Legal, Compose.

Bottom tabbar covers Home, Notifications, Messages, Me.
Header shortcuts to Models, Friend, Settings, theme toggle, Lock.

## Verification

- `npm run check` — clean
- `npm run test` — 99 passed
- `npm run test:e2e` — 4 passed
- `npm run build` — production bundle generated
- `npx cap sync` — Android sync succeeded with `llama-cpp-capacitor@0.1.0`
