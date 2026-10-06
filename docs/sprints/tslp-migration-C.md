# Sprint C — Notifications worth opening

Goal: likes/reposts/follows/quotes alerts with deep links + read state.
Files: `NotificationsPage.tsx` (build items, link rows, `notification_reads` v17), no `activity.ts` change.
Acceptance: each social event yields a tappable row landing correctly; unread clears on open.
Tests: unit (items from fixtures) + e2e (like → row → click → thread) + adb.
