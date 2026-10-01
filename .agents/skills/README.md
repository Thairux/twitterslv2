# Mirror policy (animv4 portability pattern)

`agents/skills/` is the source of truth. The four most-loaded skills are
mirrored here (and in `.claude/skills/`) so other harnesses resolve them
without path remapping: `aboutrepo`, `invariants`, `definition-of-done`,
`design-tokens`. All other skills load from `agents/skills/<name>/SKILL.md`.
