# TwitterSL v2 AGENTS.md

## Role
Act as a senior software engineer working inside the TwitterSL v2 production codebase.
v2 is a Capacitor port of v1 (`../twittersl`, Expo). Web-first: one Vite+React build
serves browser, Android, and iOS via Capacitor.

## Stack
Capacitor 6 + React 18 + TypeScript 5.6 + Vite 6 + SQLite
(@capacitor-community/sqlite on native, sql.js-equivalent fallback on web)
+ Zod validation. Node 20 LTS.

## Mandatory First-Load
1. Read `agents/skills/aboutrepo/SKILL.md`.
2. Read `agents/rules/01-aboutrepo-mandatory.md`.
3. Read `docs/README.md`, `docs/getting-started/quickstart.md`, `docs/architecture/overview.md`.
4. Confirm stack and list what exists vs missing before proposing anything.

## Architecture
Four layers, strict inward dependency (agents/rules/02):
- UI: `src/pages/`, `src/components/` (React only, no direct storage/network)
- App: `src/lib/api/` (use-cases, orchestration)
- Domain: `src/lib/domain/` (pure TS — no Capacitor, no SQLite, no fetch)
- Infra: `src/store/`, `src/native/` (SQLite, Preferences/secrets, notifications, files)

## Invariants
1. SQLite is truth; filesystem holds blobs only.
2. Domain is pure: no Capacitor/SQLite/fetch imports in `src/lib/domain/`.
3. Every Capacitor plugin sits behind `src/native/*` with a web fallback.
4. Frontend holds no authority; api layer revalidates every command (Zod).
5. Friend agent is always kind, always first reply, never troll.
6. Secrets (model endpoint URL + keys) live in Preferences/secure storage only, never SQLite/logs.
7. Persona memory is consent-gated and approval-bound to exact revisions.
8. Simulation proposes only — never deletes user posts without approval.
9. No cloud egress or spend without explicit user approval (local-first).
10. Schema is append-only: additive migrations, never edit merged SQL.

## Sprint Discipline
- Load `agents/skills/definition-of-done/` before declaring any sprint complete.
- Every sprint touches files listed in `masterplan.md`.
- Every sprint updates `docs/sprint-history/sprint-{N}.md`.
- Run `npm run check` before stop; keep `tests/` green from day 0.

## Agent Skills
`agents/skills-lock.json` is the registry and `agents/skills/` is the
project-scoped source of truth. The currently registered skills are:
`aboutrepo`, `architecture`, `background-notify`, `capacitor-frontend`,
`definition-of-done`, `demo-source-of-truth`, `design-tokens`, `dm-engine`,
`feed-engine`, `gap-critique`, `invariants`, `model-provider`,
`persona-engine`, `sqlite-persistence`, and `testing-strategy`.

Load `aboutrepo` first on every session. Load the skill matching the files
being changed; for the current Sprint 7 gate use `model-provider` and
`testing-strategy`, then load `definition-of-done` before declaring the sprint
complete. Mirrors for other harnesses are `.agents/skills/` and `.claude/skills/`.

## Rules
See `agents/rules/` for the full rule set.

## Folder Structure
See `masterplan.md` § Structure. Agents must stay faithful to it.

## UI Design System
Neobrutalist TSL tokens from `alldemos/ocdemo/` (see `alldemos/ocdemo/DEMO.md`
and `agents/skills/demo-source-of-truth/`). No ad-hoc colors, radii, or shadows.
App brand is **TSL** — the string `AGY` must never appear in the app or demo.
