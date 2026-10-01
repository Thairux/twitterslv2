# Backend — Database (Sprint 2)

Baseline `src/store/schema.sql` (17 tables + 5 indexes, v1 SCHEMA_VERSION=4
state, comma bug fixed). Writer path `native/db` → `api/db` → use-cases.
Migrations additive in `migration-defs.ts`, applied in transactions.
Adapter contract tests run green on native AND web fallback.
