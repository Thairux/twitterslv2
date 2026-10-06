# Sprint B — Social safety

Goal: remove follower, block-with-cleanup, PersonaPage correctness.
Files: `ProfilePage.tsx` (Remove button), `social-store.ts` (`blockPersona`: block+unfollow+removeFollower), `PersonaPage.tsx` (await writes, block confirm).
Acceptance: removed/blocked personas vanish from lists and feed; no stale follow rows.
Tests: unit (block leaves no rows) + e2e (remove disappears; blocked posts vanish) + adb.
