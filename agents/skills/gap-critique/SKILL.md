# gap-critique — Controlled Scope Growth

Load when proposing anything NOT in `masterplan.md` (new feature, new dep,
new experimental screen). Copied from animv4: experiments never land on main
by enthusiasm.

## Procedure
1. Write the gap: what is missing, evidence (user ask or measured failure).
2. Critique: cheaper alternatives, invariant risks, files affected.
3. Verdict: reject (do not implement) OR promote to a new masterplan phase
   + sprint with owner approval.
4. Experimental UI lives in `alldemos/` first, never in `src/` directly.

No silent scope expansion: unrelated "improvements" found mid-sprint are
logged as gaps, not implemented.
