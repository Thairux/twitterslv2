# docs — TwitterSL v2 documentation

TwitterSL v2 is an implemented Capacitor 6 + React 18 + TypeScript 5.6
local-first app. The current work is Sprint 7 verification for the models,
downloads, catalogue, and search surfaces; this is no longer a scaffold-only
repository.

Start with `getting-started/quickstart.md`, then
`architecture/overview.md`. The UI contract is
`../alldemos/ocdemo/DEMO.md`; the roadmap and sprint scope live in
`../masterplan.md`.

Use `sprints/` for planned scope and `sprint-history/` for completed-sprint
evidence. `inprogress/` contains the active handoff and dated session notes.
Project-scoped agent skills are registered in `../agents/skills-lock.json` and
their source lives under `../agents/skills/`; load only the skill relevant to
the current sprint, plus `definition-of-done` before closing a sprint.

Quality gates and their evidence are tracked in `bugs.md`, `improvements.md`,
and `regressions.md`. A finding is not complete until it reaches `CLOSED`.
