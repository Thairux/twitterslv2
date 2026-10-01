# 02 — Dependency Direction

UI → App → Domain → Infra, inward only.
- `src/pages|components` may import `src/lib/api` + `src/styles` only.
- `src/lib/api` may import `src/lib/domain`, `src/store`, `src/native`.
- `src/lib/domain` imports nothing project-internal except domain.
- `src/native/*` is the ONLY place importing `@capacitor/*`; each module
  exports a web fallback with the identical interface.

Violation = rework before review.
