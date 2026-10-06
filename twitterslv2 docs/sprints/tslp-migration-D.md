# Sprint D — Favorites (Lists-lite)

Goal: star personas in PersonaPage/Search/#tslp; favorites filters in Search + Inbox.
Files: migration v14 `favorites`, `store.ts` CRUD, `PersonaPage.tsx`, `SearchPage.tsx`, `DMsPage.tsx`.
Acceptance: star from 3 surfaces; filters show only favorites; survives restart.
Tests: unit (toggle idempotency) + e2e (star → filter) + adb.
