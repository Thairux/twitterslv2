# capacitor-frontend — React UI Rules

Load before touching `src/pages/` or `src/components/`.

## Rules
- React only: no storage, network, or Capacitor imports in UI files.
- All data via `src/lib/api/` use-cases; all styling via `src/styles/tokens.css`.
- `data-theme` dark + light required on every screen + working toggle.
- Screen parity with `alldemos/ocdemo/*.html` (see `demo-source-of-truth`).
- Lists: virtualize/window long feeds; images lazy with fixed layout boxes.
- Accessibility labels on icon-only buttons; crash boundary per route
  (`ErrorBoundary`).
- Golden path first: Post → Feed → Replies → DM → Background ping.
