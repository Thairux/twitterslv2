# background-notify — Ambient Life & Notifications

Load before touching `src/lib/background.ts`, `chatter.ts`, notifications.

## Rules
- v1 behavior parity: friend check-in ping (~3h), weekly spawn, quiet-hours +
  mute respected, notification channels + banner.
- Capacitor has no expo-background-fetch: Sprint 6 spikes the mechanism
  (resume-tick + scheduled local notifications vs community plugin) behind
  `src/native/background.ts`. Callers never change with the outcome.
- Ambient tick: 1–3 posts + persona↔persona DMs; Gazette digest
  ("While you were away" + On-this-day).
- Never notify during quiet hours; never notify for muted personas.
