# Frontend — Capacitor Parity (v1 lesson #2)

v1 retrofitted `Platform.OS === 'web'` guards and lazy SecureStore requires.
v2 rule: platform branching lives ONLY in `src/native/*`; callers use one
interface on web + native. Every adapter ships both implementations + contract
tests before any screen depends on it. `npx cap sync` wiring lands Phase 4.
