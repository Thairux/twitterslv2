# demo-source-of-truth — ocdemo Is Spec

Load before any screen work. `alldemos/ocdemo/` is the clickable UI contract.

## Rules
- Tokens, shell (header/tabbar), and per-screen layout copy the demo verbatim;
  adapt only where React structure requires (extract shared shell component —
  v1/Antigravity lesson: brand string lives in ONE place, passed as a prop).
- Brand is **TSL**. The string `AGY` must never appear — grep demos + `src/`
  before every sprint close (`AGY` allowed only inside `alldemos/agydemo/`,
  the frozen v1 archive).
- Per-screen titles: `TSL — Feed|Thread|Me|Notifications|Messages|Friend|
  Models|Settings`. The top-left logo is identical on all screens BY DESIGN
  (shared shell); the Antigravity bug was the *string*, not the repetition.
- `alldemos/agydemo/` is frozen v1 reference — never edit.
- Storage keys in demos use the `ocdemo-` prefix (`tsl-` in the app).
