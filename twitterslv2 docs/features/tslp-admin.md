# #tslp — "twitter sl personas" Admin Panel (Feature Spec)

> Status: IMPLEMENTED in 2.0.0, hardened in 2.1.0. Source: user brief
> ("now add a feature a major one…") from the handoff-004 session.
> Implementation: `src/pages/TslpPage.tsx:1-510`. Route: `/tslp` (`src/App.tsx:81`).

## 1. What it is

`#tslp` in full is **twitter sl personas**: a local-only admin/creator surface
where you see the island the way iLands shows an agent's phone — every
persona's activity, their chats with each other, and their chats with you —
plus data dashboards and a friend creator. It is READ-heavy by design; the
only writes are starring favorites and creating a friend (both explicit
buttons). No cloud egress, no export, no spend.

## 2. Brand

Dark neobrutalist surface: black background, header plate = purple rectangle
(`#7b2ff7`) with `#tslp` in bold white plus the full name "twitter sl
personas — island admin" beneath in yellow (`#f5d90a`), double hard shadow
(yellow offset overlapping a purple glow). All cards reuse TSL design tokens;
no ad-hoc colors. Entry: **Settings row link only** — deliberately NOT in the
main 5-tab bar (`src/App.tsx:31-37`).

## 3. Tabs

| Tab | testid | Contents |
|-----|--------|----------|
| All | `tslp-tab-all` | Every non-`user` persona as phone cards (`tslp-grid`, `tslp-card-<id>`): avatar initial, display name + role, handle, ★ toggle (`tslp-fav-<id>`). Filter box (`tslp-filter`) matches name/handle/role. |
| ★ Favs | `tslp-tab-favorites` | Same cards, favorites only. |
| Stats | `tslp-tab-dashboards` | Global "Today on the island" card (`tslp-global-stats`): posts, replies, likes given, DMs to you, DMs to personas, your DMs. Per-favorite cards (`tslp-favstat-<id>`): posts, replies, likes given/received, DMs to you / to personas / from you. |
| ＋ Friend | `tslp-tab-create` | Friend creator (`friend-creator`): textarea (`friend-desc`) → Generate preview (`friend-generate`) → preview card (`friend-preview`, shows `via: glimmer/offline`) → Confirm (`friend-confirm`) → navigates to `/messages/<newId>`. |

## 4. Persona phone view (iLands adaptation)

Tapping a persona card (avatar or name) opens `PersonaDetail`
(`tslp-detail-<id>`): a phone-width sheet with identity header (name, handle,
role, affinity %, bio/vibe), a one-line stats strip, and three tabs:

- **Posts** — last 20 posts by the persona (`posts WHERE author_id = ?`).
- **DMs w/ you** — the full `user:<personaId>` thread, both directions,
  speaker-labelled (You vs persona name).
- **DMs w/ island** — persona↔persona threads: every `dms` row whose
  `thread_id` does NOT start with `user:` and which involves the persona as
  sender or thread member (last 30 of the last 200 DMs). This data is written
  by `ambientBeat` (`src/lib/api/activity.ts`) and is invisible everywhere
  else in the app — #tslp is the only surface that shows it.

Queries are single-table `SELECT`s with JS-side filtering, so they work on
both the native SQLite driver and the web fallback (see discovery: web driver
supports single-table SELECT only, `src/lib/api/store.ts` notes).

## 5. Friend creator (Awaken-style, local-first)

Describe → `generatePersona()` (`src/lib/api/persona-generator.ts`) with
`allowFriend: true` → preview → confirm writes the persona
(`role: 'friend'`, `affinity: 1.0`), follows both ways, and sets
`agent_config primary_friend_id` so the header Friend button and `/friend`
resolver point at THE friend (resolves the coral / Mimi / pearl triple-friend
identity). Generation uses the live endpoint when configured and says so
(`via`); otherwise honest offline fallback. Nothing is sent anywhere without
tapping Generate (invariant 9).

## 6. Data model (append-only migrations)

- `favorites` (`persona_id` PK, `created_at`) — `store.listFavorites` /
  `toggleFavorite` (`src/lib/api/store.ts:417-427`).
- `agent_config primary_friend_id` — no migration needed.
- Stats are derived, never stored: `personaStats(store, id)` and
  `todayStats(store, day?)` (`src/lib/api/stats.ts:33-73`) count posts,
  replies, likes, and DM directions from `created_at` ISO text.

## 7. Invariants specific to #tslp

1. Read-only except stars + friend creation. No delete/reset actions live here.
2. Persona↔persona DM content never leaves the device (no share/export buttons).
3. New dashboard queries MUST stay single-table + JS-join (web-driver rule).
4. Favorite dashboards cap at 12 personas per load (perf guard in `reload()`).
5. Entry stays out of the tabbar; reachable via Settings `#tslp admin` link.
