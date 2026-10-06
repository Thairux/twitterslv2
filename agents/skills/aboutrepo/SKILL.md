---
name: aboutrepo
description: Mandatory first-load skill for the TwitterSL v2 codebase. Use this skill at the start of every session to verify stack, architecture docs, rules, and sprint context before any claim or edit.
---

# aboutrepo — Mandatory First-Load

Load this skill FIRST every session, before any claim or edit.

## Procedure
1. List the repo root; confirm `package.json` stack = Capacitor 6 + React 18 +
   TS 5.6 + Vite 6 + SQLite + Zod.
2. Read `agents/rules/01-aboutrepo-mandatory.md`.
3. Read `twitterslv2 docs/README.md`, `twitterslv2 docs/getting-started/quickstart.md`,
   `twitterslv2 docs/architecture/overview.md`.
4. List what exists vs what is missing relative to `masterplan.md` § Structure.
5. State the sprint you are on and the exact files it touches.

## Laws
- Filesystem is truth. Never claim a file exists without reading/listing it.
- v1 lives at `../twittersl` (Expo) — reference only, never import from it.
- If evidence is missing, inspect it; never hallucinate structure.
