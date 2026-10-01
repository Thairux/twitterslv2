# TwitterSL v2 Master Plan — Capacitor Port

## Mission
Port v1 (`../twittersl`) to Capacitor 6 + Vite + React + TS with behavior
parity, fixing v1's structural mistakes. One web build (`dist/`) serves
browser preview, Android, and iOS. The original scaffold plan has been
superseded by the implemented repository; use the sprint files and current
handoff as the execution source of truth.

## Stack shift (Expo → Capacitor)

| v1 (Expo) | v2 (Capacitor) | Notes |
|---|---|---|
| expo-router | react-router-dom | Routes → `src/pages/` |
| expo-sqlite | @capacitor-community/sqlite + web fallback | Behind `src/native/db.ts` |
| expo-secure-store | Preferences + secure storage, `src/native/secrets.ts` | Same contract |
| expo-notifications | @capacitor/local-notifications + web banner | Channels + quiet hours kept |
| expo-background-fetch/task-manager | Sprint 6 spike (resume-tick + scheduled notifs vs plugin) | Only open risk |
| expo-file-system | @capacitor/filesystem + IndexedDB/OPFS web fallback | DB keeps paths |
| llama.rn (null on web) | HTTP Model Endpoint primary; on-device only if Sprint 7 spike passes | No silent stubs |
| glimmerChat | `model-client.ts` ("Model Endpoint URL") | Attempt history + offline flag |

Correction to the brief: v1 contains **no Tauri code** (verified: zero hits) —
it is Expo. This plan ports Expo → Capacitor, not Tauri → Capacitor.

## Invariants (see agents/skills/invariants/)
SQLite truth · domain purity · friend-first-kind · secrets in secure storage ·
consent-gated memory · simulation-proposes-only · local-first · append-only
schema · attempt-history on generations · TSL brand (no AGY).

## Phases
- **Phase 0 — Scaffold (Sprint 0):** repo, skills/rules/hooks, ocdemo, schema
  baseline. ✅ complete
- **Phase 1 — Shell + Data (Sprints 1–2):** tabs shell, tokens/themes, router;
  storage adapters, migrations, seeds, launch, config.
- **Phase 2 — Social core (Sprints 3–6):** domain port verbatim + unit suite;
  feed/thread/composer; profile/persona; DMs/friend/meter.
- **Phase 3 — Intelligence (Sprints 7–8a):** model-client, HF hub, settings,
  notifications/background, chatter, gazette, search, memory approvals.
- **Phase 4 — Hardening (Sprint 8b):** onboarding/legal, export/reset, E2E full
  green, Android + iOS shells (`cap sync`, icon, splash), release notes.

## Sprints (one at a time, each gated by definition-of-done)
0 Scaffold ✅ · 1 App shell ✅ · 2 Storage ✅ · 3 Domain ✅ · 4 Feed ✅ ·
5 Profile ✅ · 6 DMs/Friend ✅ · 7 Models/Endpoint ✅ implementation, manual
verification pending · 8 Ambient + Release planned.
Details: `docs/sprints/sprint-0N.md`. No batch execution (v1 lesson: batched
sprints 2–8 and 9–16 shipped a schema syntax error and retrofitted polish).

## Structure (law — see agents/rules/03)
```
src/{main.tsx,App.tsx,pages/*,components/*,lib/domain/*,lib/api/*,
     lib/{config,sim-engine,chatter,background,launch,memory-extract,daily,world-events}.ts,
     store/*,native/*,styles/*}
agents/{skills/*,rules/*,hooks/*,prompts/*,skills-lock.json}
docs/{...} tests/{unit,integration,e2e} scripts/ alldemos/{ocdemo,agydemo/}
```

## v1 mistakes → v2 answers
1. Batched sprints w/o verification → one sprint at a time + DoD gate + hook log.
2. Web/native divergence (lazy guards retrofitted) → adapters own branching (rule 02).
3. Fake `@bramble` data leaking → seeds are personas, never content (rule: grep before close).
4. Terminology drift (Glimmer Endpoint) → "Model Endpoint URL" in rule 05 + skill.
5. Schema comma bug from loose fixers → baseline verified against v1 file; additive only.
6. Polish-as-afterthought → tokens + ocdemo parity + tests green from day 0.

## Open risks (spikes, not commitments)
R1 Background execution on Capacitor (Sprint 6). R2 On-device inference
(Sprint 7; HTTP endpoint is the committed path). R3 iOS SQLite encryption +
keychain hardening (Phase 4).
