# Sprint G — Threading navigation + drafts

Goal: collapse/expand subtrees, reply counts, direct-parent labels, likes on replies, newest/oldest sort; composer autosave/restore/discard.
Files: `ThreadPage.tsx`, `ComposePage.tsx`, migration v15 `drafts`, `store.ts` draft CRUD.
Acceptance: 3-deep threads navigable w/ correct labels; killed composer restores.
Tests: unit (flatten/labels, draft CRUD) + e2e (nested label, draft restore) + adb.
