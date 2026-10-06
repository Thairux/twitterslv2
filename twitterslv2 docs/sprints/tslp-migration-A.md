# Sprint A — Visible-stub sweep

Goal: no raw ids, correct poll bars.
Files: `PostCard.tsx` (quote card, authorName prop, poll % fix), `ThreadPage.tsx` (direct-parent label), `GazettePage.tsx` + `PersonaPage.tsx` (PostCard + names), `SearchPage.tsx` DM sender names, new `usePersonaNames` hook.
Acceptance: Feed/Thread/Search/Gazette/Persona show display names; quotes render embedded cards; poll bars sum to 100%.
Tests: unit (names map, poll math) + e2e (quote card, no raw-id pattern) + adb screenshot.
