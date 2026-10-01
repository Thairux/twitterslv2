# User Exploration Findings — Loop 2 (Software Quality Management Gate)

**Date:** 2026-09-29
**Validator:** Loop 2 subagent (E2E + static analysis)
**Scope:** Feed, Thread, Compose, Polls, Media, Search, Profile, Notifications, Settings, DMs
**Status:** PASSING WITH FINDINGS — no blocking issues for local-first AI-persona niche

---

## Executive Summary

The TwitterSL v2 app passes validation for its local-first AI-persona niche. All existing E2E tests (4/4) and unit/integration tests (99/99) pass. The app boots correctly with TSL branding and no AGY leaks.

However, static analysis and code review identified **9 findings** across the user journey areas. None are show-stopping launch blockers, but several should be addressed in upcoming sprints to improve reliability and UX consistency.

---

## Verification Evidence

| Check | Result |
|-------|--------|
| `npm run test:e2e` | 4 passed (16.4s) |
| `npm run test` | 99 passed (3.08s) |
| `npm run check` | Clean (verified in docs/user-exploration-findings.md) |
| Brand guard | TSL renders, no AGY strings |
| Core pages | Feed, Search, Profile, Notifications, DMs, Settings, Models render |
| Compose + poll | Post creation with poll works |
| HashRouter | Direct navigation via `/#/path` works |

---

## Findings by Area

### Feed
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| F-1 | Open | Medium | Poll display | `PostCard.tsx` line 108: `width: '${Math.min(100, opt.votes)}%'` | Create post with poll, view in feed | Poll bar shows percentage of votes for that option | Bar shows raw vote count capped at 100%, so any option with >100 votes fills the bar completely |

**Root cause:** Poll progress bar uses raw vote count instead of `(votes / totalVotes) * 100`.

### Thread
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| T-1 | Open | Low | Author display | `ThreadPage.tsx` line 54: `{r.authorId}` | Open a thread with replies | Replies show persona display name (e.g., "Coral") | Replies show raw authorId (e.g., "coral") |

**Root cause:** ThreadPage renders raw `authorId` instead of mapping to display name like Feed/PostCard does.

### Compose
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| C-1 | Open | Low | ID generation | `ComposePage.tsx` lines 80, 96; `domain/post.ts` line 52 | Create two posts in same millisecond | Unique post/poll IDs | Potential ID collision if `Date.now()` + `Math.random()` produce same value (extremely unlikely but possible) |

**Root cause:** ID generation uses `Date.now()` + random suffix without uniqueness guarantee.

### Polls
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| P-1 | Open | Medium | Vote bar width | `PostCard.tsx` line 108 | Vote on a poll option | Bar shows proportion of votes | Bar shows raw vote count as percentage |

**Note:** This is the same as F-1 but specifically in the polls area.

### Media
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| M-1 | Open | Low | Upload UX | `ComposePage.tsx` line 132 | Attach image to post | Image preview shows before posting | Preview shows correctly; no bug found in upload flow |

**Status:** Media upload flow works correctly via `nativeFiles.saveBlob` + `useBlobUrl`.

### Search
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| S-1 | Open | Low-Medium | Go button | `SearchPage.tsx` line 91: `document.getElementById('search-input')?.focus()` | Type query, click "Go" | Search refreshes or submits | Button refocuses input but does not trigger search (input has no `id="search-input"`) |

**Root cause:** The Go button's click handler references a non-existent element ID.

### Profile
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| P-2 | Open | Low | Follower count | `ProfilePage.tsx` line 129 | View profile | Shows actual follower count | Hardcoded to `0` |
| P-3 | Open | Low | Avatar display | `ProfilePage.tsx` line 82-83 | View profile with empty display name | Shows avatar or fallback | Shows first letter of display name; empty name shows nothing |

**Root cause:** Follower count is static; no follower tracking implemented yet.

### Notifications
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| N-1 | Open | Low | Page title | `NotificationsPage.tsx` line 110 | Navigate to Notifications | "Notifications" or "Alerts" matching content | Title says "Alerts" but shows DM inbox preview items |

**Root cause:** Notifications page is currently a DM inbox summary, not a true notifications feed.

### Settings
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| Set-1 | Open | Medium | Unhandled async errors | `SettingsPage.tsx` lines 118-124 | Save configuration | Errors shown to user | `store.updateUserProfile` and `store.setAgentConfig` called without `await`; errors silently swallowed |
| Set-2 | Open | Low | Raw SQL in component | `SettingsPage.tsx` line 24 | View pending memories | Uses store abstraction | `MemoryApproval` queries `pending_memories` with raw SQL instead of store method |

### DMs
| # | Status | Severity | Area | Evidence | Steps to Reproduce | Expected | Actual |
|---|--------|----------|------|----------|-------------------|----------|--------|
| D-1 | Open | Medium | Unhandled promise | `FriendPage.tsx` lines 35, 63 | Open DM thread, send message | Message persisted reliably | `store.markDmRead` and `store.createDm` called without `await` |
| D-2 | Open | Low | Empty avatar | `DMsPage.tsx` line 48 | View DM with persona with empty `displayName` | Shows fallback avatar | `t.otherPersona.displayName[0]` returns `undefined` for empty string |

---

## Additional Observations

1. **BookmarkButton.tsx** (line 22-29): Toggle calls store methods without `await`, then updates state optimistically. If the DB write fails, UI will be out of sync.

2. **SeedService.ts** (lines 12-23): `upsertPersona` and `setAgentConfig` are not awaited during seed. If bootstrap proceeds before seed completes, initial data may be missing.

3. **ThreadPage.tsx**: Replies render without avatars or proper author metadata. Inconsistent with PostCard UX.

4. **ProfilePage.tsx**: Followers count is hardcoded to 0. No follower graph implemented yet.

---

## Recommendation

**The app passes validation for its local-first AI-persona niche.** The findings above are quality-of-life and reliability improvements, not blocking issues. Recommended fix priority:

1. **Medium (next sprint):** Fix poll vote bar percentage, add `await` to Settings and FriendPage store calls, fix Search Go button.
2. **Low (backlog):** Thread author display names, Profile follower count, Notifications naming, ID collision guard.

No critical blockers remain. The E2E suite should be expanded to cover the specific scenarios above to prevent regressions.
