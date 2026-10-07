# Sprint v3-S2 — Provider system overhaul (→ 3.0.0 Phase A/B)

## Goal
OpenCode-style provider profiles: file-shaped templates, all four kinds,
per-persona routing, auto-fetch model cache, failover chain, budgets,
portable sans-secrets configs, auto-migration, dedicated route.

## Changes
- Schema v19: `provider_profiles(id PK, name, kind, endpoint, auth_type,
  auth_header, model, options_json, priority, budget_json, created_at)`,
  `persona_providers(persona_id PK, profile_id)`,
  `provider_models_cache(profile_id PK, models_json, fetched_at)`.
  Auto-migrate existing `providers` rows + global slots once (flag in
  agent_config); old tables stay (append-only) but code switches.
- Secrets: per-profile keys via extended provider-key pattern.
- Routing: ambient resolves provider per persona (`persona_providers`
  → kind default → priority chain); ordered failover walk per policy.
- Budgets: hourly call counters (in-memory + daily rollup) with warn +
  hard stop per profile; UI in new page.
- Discovery: fetch `/v1/models` per profile on add/refresh, cache,
  manual override always allowed.
- Import/export templates minus keys (JSON file download/upload).
- New `/providers` route (`ProvidersPage`): list, editor, switcher,
  chain order, budgets, import/export. Settings links to it; old
  ProviderManager section removed (replaced by link).
- Auth: API key + custom header/prefix per profile.
- Tests: migration test, routing test, budget test, cache test.

## Acceptance
- Fresh + upgraded DBs work; per-persona routing observed in logs;
  chain failover tested with fakes; budgets stop calls; check green.
