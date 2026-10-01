# 07 — Secrets & Consent

Endpoint URL + API keys live in secure storage via `src/native/secrets.ts`
only. Never in SQLite, logs, error messages, demos, or screenshots.
Persona memory requires explicit consent; prompts stay out of logs.
Backup/export bundles exclude secrets and require user confirmation.
