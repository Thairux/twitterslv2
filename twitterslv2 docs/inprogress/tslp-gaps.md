# #tslp / Migration Gaps (validated against code, 2.0.0 → 2.1.0)

> Method: `twitterslv2 docs/inprogress/ilands-discovery.md` claims + the #tslp brief
> checked file-by-file against `src/`, `src/store/migration-defs.ts`
> (SCHEMA_VERSION 17), and `releases/2.0.0/`. An independent audit subagent
> re-checked the same surface; its findings are merged below.

## Audit merge (2026-10-06, read-only subagent)

The audit VERIFIED every 2.0.0 release-notes claim with file:line evidence
(#tslp, friend creator, nesting, notifications, favorites×4 surfaces, quote
cards, names, counts, views, Seen, drafts, filters, media tab, safety,
1500 cap, schema v14–v17) and ranked 10 gaps. Accepted into 2.1.0 (all S):
thread-root/Chatter/quote raw ids, inbox unread dot, #tslp Me-page entry,
`todayStats` likes day-filter, island-DM segment matcher. Left as designed:
Chatter kept (approved LOW IMP-2.0-07), #tslp out of tabbar, onboarding +
muted-words + reply-audience per cut list. No action: stats full-scan scale
(note before 1500-cap growth), `post_views` non-UNIQUE pair (counts = opens,
as displayed).

## CLOSED by 2.0.0 (verified in code)

Sprints A–H all landed: quote cards, display names, poll % fix, remove
follower (`ProfilePage.tsx:92`), block-with-cleanup
(`social-store.ts:100`), notification center with read persistence
(`store.ts:472-476`), favorites (`store.ts:417-427`), #tslp read + writes
(`TslpPage.tsx`), friend creator + `primary_friend_id` (seeded
`persona-friend`, `seed.ts:36-38`, `/friend` resolver `FriendRoute.tsx`),
thread collapse/sort/direct-parent (`ThreadPage.tsx:20,160,199`), reply
likes, drafts (`ComposePage.tsx:71,158`), Seen receipts (per-thread `seen:`
cursor), typing delay, view counts (`store.ts:457-464`, `FeedPage.tsx:36`),
search media filter (`SearchPage.tsx:37,184`), profile media tab, schema
v14–v17 (`favorites`, `drafts`, `post_views`, `notification_reads`).

## GENUINE GAPS (this release fixes the actionable ones)

### G1 — No TSL app icon (OPEN → fixed 2.1.0)
`resources/icons/` is empty; Android ships stock Capacitor mipmaps;
`index.html` has no icon/manifest. Spec (from brief): black background,
purple `#tsl` plate, yellow + purple overlapping hard shadows.
Fix: generated `resources/icons/tsl-icon-512.png` (+ SVG master), all
Android mipmap densities, web `icons/` + manifest + favicon wiring.

### G2 — CHANGELOG missing 2.0.0 (OPEN → fixed 2.1.0)
`CHANGELOG.md` jumped 1.0.12 → (nothing). Fix: full 2.0.0 entry + 2.1.0.

### G3 — Feature docs stale (OPEN → fixed 2.1.0)
`twitterslv2 docs/features/*.md` described the pre-migration app; no #tslp spec, no
inventory. Fix: new `twitterslv2 docs/features/tslp-admin.md` (spec),
`twitterslv2 docs/features/app-features.md` (full inventory), this file.

### G4 — #tslp discoverability (OPEN → improved 2.1.0)
#tslp is reachable only via the Settings `#tslp admin` link — no tabbar
entry, no home-screen button. The brief's "home button where you enter the
agent's phone" maps to tapping a persona card → phone-view sheet, which
exists. Fix in 2.1.0: Me-page `#tslp` entry card (`profile-tslp-entry`) in
brand plate style; tabbar still untouched by design. Revisit a Search/DMs
cross-link only on user request.

### G5 — Stale boot client / dishonest origins (OPEN → fixed 2.1.0)
Reported post-2.0.0: endpoint Check + test chat OK, personas still on
offline pools. Root causes: model-less boot client (`bootstrap.ts`),
`friendPing` bypass + hardcoded `offline` origin (`background.ts`), crowd
replies mislabelled `glimmer` on fallback (`sim-engine.ts`), island DMs
mislabeled `offline` on success (`chatter.ts`), Save dropped the model id
(`SettingsPage.tsx`). Fix: live re-resolution everywhere, honest origins,
`ambient-status.ts` diagnostic + Settings status line. Tests:
`tests/unit/ambient-honesty.test.ts` (8).

### G6 — Approved LOWs (unchanged, documented in release notes)
Global-only muted words, Chatter kept as-is, manual-URL onboarding,
deferred reply-audience gating (no schema). Left open only with the
standing user approval recorded in `releases/2.0.0/release-notes.md`.

## Deferred (out of scope, see discovery cut list)

Group DMs, Communities/Spaces, restrict tier, federation/cloud sync, token
economy, E2E encryption, video/GIF pipeline, FTS5, edit history.
Reply-audience gating: schema still unbuilt; needs a fresh sprint + user
go-ahead, not snuck into a patch/minor.
