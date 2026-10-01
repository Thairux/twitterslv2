# 03 — New-File Gate + SQLite Single Source of Truth

New file requires: (1) why it must exist, (2) what breaks without it,
(3) which doc/sprint justifies it. No speculative scaffolding beyond
`masterplan.md` § Structure.

SQLite is truth; filesystem holds blobs only. One writer path
(`native/db` → `api/db` → use-cases). Schema changes are additive
migrations — never edit merged SQL in `src/store/schema.sql`.
