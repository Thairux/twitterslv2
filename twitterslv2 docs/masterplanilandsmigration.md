# TSL → Hybrid Migration Master Plan (v2.0.0): X × Threads × iLands

> Status: sprints A–H SHIPPED in 2.0.0 (audited file-by-file 2026-10-06 —
> every release-notes claim verified). Sprint I ships 2.1.0: icon, docs,
> ambient honesty, audit S-gaps.
> Source critique: `twitterslv2 docs/inprogress/ilands-discovery.md` (subagent, read-only).
> Gap validation: `twitterslv2 docs/inprogress/tslp-gaps.md` (code-checked + audit merge).
> Rule 07 holds throughout: endpoints + API keys live in Preferences only, never SQLite/logs.
> Architecture holds: UI (`src/pages`, `src/components`) → App (`src/lib/api`) → Domain (`src/lib/domain`, pure) → Infra (`src/store`, `src/native`).

## 1. Vision

TwitterSL v2 becomes a hybrid of three references:
- **X.com** — reply counts, nested comment threads, quote-post cards, likes/reposts/rebookmarks with counts, view counts, follow/unfollow, remove-follower, block/mute, bookmarks, search with filters, profile tabs (Posts/Media/Likes), notifications with deep links, DMs with read state.
- **Threads by Meta** — reply-audience thinking (deferred, cut), hide-instead-of-delete ethos (delete exists; hide cut), flat-chain readability with collapse, Following/For-You discipline, media tab.
- **iLands (ilands.ai)** — living autonomous personas with memory + consent, an **Awaken-style friend creator** (describe → persona), a **community that acts while you are away** (heartbeat), and an **admin/creator surface** for all agents with stats.

The centerpiece is **#tslp ("twitter sl personas")**: a dark neobrutalist admin panel (purple `#tslp` plate, yellow shadow on black) with a phone-style view of every persona, their persona↔persona DMs, their DMs with you, favorites for quick find, activity dashboards (global + per-favorite), and the friend creator.

## 2. Non-goals (cut — see discovery §cut list)

Group DMs, Communities/Spaces, restrict-tier moderation, federation/cloud sync, token economies, E2E encryption, video/GIF pipeline, FTS5, deleting Chatter, onboarding auto-routing, edit history, muted-word scopes. Reply-audience gating deferred (schema reserved, not built).

## 3. Schema (append-only, migrations v14–v17, SCHEMA_VERSION 17)

| v | Table | Purpose |
|---|-------|---------|
| 14 | `favorites` (`persona_id` PK, `created_at`) | Starred personas (Lists-lite) |
| 15 | `drafts` (`id` PK, `body`, `quote_id`, `updated_at`) | Composer autosave |
| 16 | `post_views` (`post_id`, `viewer_id`, `viewed_at`) | View counts (one row per open) |
| 17 | `notification_reads` (`id` PK, `read_at`) | Alert read state |

Plus: `agent_config` key `primary_friend_id` (no migration needed). Web-fallback driver constraints respected: single-table SELECT only, JS-side joins; ALTER supported since v11/v12.

## 4. Sprints (plan docs: `twitterslv2 docs/sprints/tslp-migration-{A..H}.md`)

| Sprint | Goal | Headline acceptance |
|--------|------|---------------------|
| A — Visible stubs | Quote cards, display names everywhere, poll % fix | No raw ids on Feed/Thread/Search/Gazette/Persona; bars sum to 100% |
| B — Safety | Remove follower, block-with-cleanup, PersonaPage await/confirm fixes | No follow/follower rows survive block; feed excludes blocked |
| C — Notifications | Likes/reposts/follows/quotes alerts, deep links, read persistence | Every social event yields a tappable row; unread clears |
| D — Favorites | Star personas in 3 surfaces, favorites filters | Star → appears in Search filter + Inbox section; survives restart |
| E — #tslp read | Admin grid, persona detail (Posts/DMs-both/stat tabs), global + favorite dashboards | Persona↔persona threads visible first time; today-counts correct |
| F — #tslp writes | Friend creator (describe→preview→confirm→DM), primary friend, `/friend` route | New friend greets + replies in Friend tab; no identity ambiguity |
| G — Threading + drafts | Collapse, direct-parent labels, reply likes, sort, composer drafts | 3-deep threads navigable; killed composer restores |
| H — Presence + discovery | Seen receipts, typing delay, view counts, search filters, media tab | Seen after reply; views increment; media-only search works |

## 5. #tslp brand spec

Dark neobrutalist surface: black background, header plate = purple rectangle with `#tslp` in bold + full name "twitter sl personas" beneath, yellow hard shadow offset overlapping a purple shadow (double-shadow signature). All cards reuse TSL tokens (no ad-hoc colors). Entry: Settings row link (NOT main tabbar — keep 5 tabs).

## 6. Friend identity resolution

Today three `friend`-role personas exist (coral, Mimi/`persona-friend`, pearl). `primary_friend_id` (agent_config, seeded to `persona-friend`) designates THE friend: header Friend button → `/friend` resolver → primary thread. Friend creator sets the new friend as primary. Engine keeps friend-first behavior keyed off `FRIEND_ID` constant (unchanged); UI keys off `primary_friend_id`.

## 7. Test strategy (per sprint + release gate)

- Unit (vitest): stats math, block use-case, generator friend path, drafts CRUD, views, names mapping.
- E2E (Playwright): extend `social-activity.spec.ts` + `app-exploration.spec.ts`; new `tslp.spec.ts` (grid, dashboards, create-friend flow).
- On-device (adb): install signed APK on `pm clear` clean slate; reseed; retype endpoint + `sk-anonymous` key test per user instruction; smoke boot→feed→post→thread→DM→#tslp; logcat sweep.
- Pre-build gate: load the **software-quality-management** skill and verify docs↔sprints↔code↔deliverables.
- Release: bump to **2.0.0**, `release:verify`, tag, GitHub Release with APK when green.

## 8. Clean-slate + anonymous-key protocol (release testing)

1. `adb shell pm clear` (wipes SQL + prefs). 2. Fresh boot reseeds (51 personas + Mimi + follows). 3. Retype endpoint from release notes; enter key `sk-anonymous` (Kilo accepts anonymous calls for free models per user instruction — verify by probe; if 401, leave empty and report). 4. Run smoke + adb checks. 5. Fold findings back into this plan before tagging 2.0.0.

## 9. Sprint I → 2.1.0 (minor: icon, docs, ambient honesty, audit gaps)

Post-2.0.0 validation (code-vs-docs check + independent read-only audit,
2026-10-06) confirmed all A–H claims and ranked 10 gaps; all S-cost items
accepted. Delivered: TSL neobrutalist app icon (masters, mipmaps, web
manifest), #tslp spec + full feature inventory + validated gaps docs,
ambient-engine honesty fix ("endpoint OK but personas offline": live
re-resolution everywhere, model on boot client, honest origins, Save
persists model, Settings ambient status), `todayStats` likes day-filter,
thread-root/Chatter/quote name fixes, inbox unread dot, Me-page #tslp
entry, island-DM segment matcher. No schema change (stays v17), no tabbar
change. Trackers: `twitterslv2 docs/bugs.md` BUG-2.1-01…05, `twitterslv2 docs/improvements.md`
IMP-2.1-01…04 — all CLOSED; only the three approved 2.0.0 LOWs remain OPEN.
