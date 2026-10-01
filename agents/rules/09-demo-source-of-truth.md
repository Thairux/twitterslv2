# 09 — Demo Source of Truth

`alldemos/ocdemo/` is the UI contract: tokens + shell + per-screen layout.
Port screens against it; deviations need a gap-critique note.
`alldemos/agydemo/` is the frozen v1 original — read-only reference, never edit.
Experimental UI starts in `alldemos/` and promotes to `src/` only via an
approved sprint (animv4 experimental-promotion pattern).
