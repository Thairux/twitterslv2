# Provider system spec (3.0.0, OpenCode-style overhaul)

## Profiles (`provider_profiles`)
id, name, kind (chat|image|caption|local), endpoint, auth_type
(bearer|header), auth_header (e.g. `x-api-key`), model, options_json,
priority (chain order per kind), budget_json {maxCallsPerHour},
created_at. Keys live in secure storage per profile id (never SQLite).
`persona_providers(persona_id → profile_id)` overrides kind default.
`provider_models_cache(profile_id → models_json, fetched_at)` holds
auto-fetched `/v1/models` lists (manual id always allowed).

## Chain + budgets
Ambient resolves: persona override → active kind default → priority
order walk. Each attempt checked against hourly budget (in-memory
counters + daily rollup); exceeded → skip with status (hard stop).
Full budgets UI: set caps, see usage, warnings.

## Portability
Export template JSON minus keys; import re-keys on entry. Validates
shape with Zod before save.

## Migration
One-time: existing `providers` rows + global endpoint/key/model slots
→ profiles (kind-matched, priority by creation); flag
`providers_migrated_v19`. Old tables remain (append-only); all code
reads new system; old Settings section replaced by link to
`/providers` (`ProvidersPage`: list, editor, chain order, budgets,
models cache, import/export).

## Invariants
Rule 07 (secrets never SQLite/logs) holds; explicit Generate/Validate
buttons only (no background spend); per-persona routing logged.
