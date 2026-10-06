# Sprint E — #tslp admin panel (read)

Goal: phone-style grid of ALL personas; detail tabs Posts / DMs-with-you / DMs-with-personas / stats; global + favorites dashboards (today counts).
Files: `src/pages/TslpPage.tsx`, route `/tslp`, Settings entry, `src/lib/api/stats.ts` (single-table queries + JS joins only).
Acceptance: persona↔persona threads visible first time; dashboards correct; read-only; web-driver safe.
Tests: unit (stats math) + e2e (`/tslp` grid + tabs) + adb.
