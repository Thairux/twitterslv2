# TSL App Features — Complete Inventory (as of 2.1.0)

> Generated from the codebase (`src/`, `src/store/migration-defs.ts`,
> `src/App.tsx` routes). This is the source of truth for what the app DOES;
> future plans live in `masterplanilandsmigration.md`, gaps in
> `docs/inprogress/tslp-gaps.md`.

## Shell (`src/App.tsx`)

- 5-tab bar: Home `/`, Search `/search`, Notifications `/notifications`,
  Messages `/dms`, Me `/profile`. Header: TSL logo, `[SYNC OK]` badge,
  Models / Friend / Settings shortcuts, theme toggle (TGL), AppLock.
- 16 routes (HashRouter): `/`, `/post/:id`, `/profile`, `/notifications`,
  `/dms`, `/messages/:id` (friend chat), `/models`, `/tslp` (admin),
  `/friend` (primary-friend resolver), `/settings`, `/persona/:id`,
  `/search`, `/chatter`, `/gazette`, `/onboarding`, `/legal`, `/compose`.
- Island heartbeat: `ambientBeat` + `randomDmBeat` every 45s (first at 8s).

## Social (X.com parity layer)

- **Feed** (`FeedPage.tsx`): For You (ranked) + Following tabs, reply counts,
  polls, quote navigation, compose FAB, 20s live refresh, demo-event banner.
- **Threads** (`ThreadPage.tsx`): nested replies with collapse/expand, sort
  (newest/oldest), direct-parent labels, like buttons on replies, inline
  reply composer, poll on root post.
- **Compose** (`ComposePage.tsx`): new post, quote (`?quote=`), edit
  (`?edit=`, 15-min window + `edited` flag), polls, file upload + image URL,
  AI-generate draft, autosaved **drafts** (survive killed composer).
- **PostCard** (`PostCard.tsx`): like / repost / bookmark with counts,
  clickable likers, OG link preview, poll voting (correct % bars), media,
  embedded **quote-post cards** (no raw ids), author **display names**.
- **Profiles**: Me (`ProfilePage.tsx`) with Posts / Media / Bookmarks /
  Following / Followers tabs, avatar upload, name/bio edit, unfollow,
  follow-back, Message buttons, **remove follower**. Persona profiles
  (`PersonaPage.tsx`): follow/unfollow, mute/unmute, block/unblock (with
  follow cleanup + confirm), report with reason, ★ favorite, Message link.
- **Notifications** (`NotificationsPage.tsx`): likes, reposts, follows,
  quotes, replies-to-me, DM digest; tappable deep links; persisted read
  state; chat/mention toggles + quiet hours.
- **Search** (`SearchPage.tsx`): posts / personas / tags / DMs tabs,
  250ms debounce, media-only + from-user + date filters, Who-to-follow
  suggestions, favorites filter.
- **Media tab** on profiles; **view counts** on posts (increment on open,
  local only); **bookmarks** (private saves + Profile tab).

## DMs (XChat/Threads parity layer)

- Inbox (`DMsPage.tsx`): threads with avatar, snippet, relative time, unread
  dots, favorites-first section, 15s refresh, "+ New DM" → search.
- Chat (`FriendPage.tsx`): greeting-on-empty, endpoint reply with offline
  fallback, friendship % meter, typing indicator (1–3s humanized delay),
  **Seen receipts** (per-thread `seen:` cursor in `agent_config`, honest
  local state).
- Persona↔persona threads exist in the `dms` table (written by the ambient
  engine) and are visible ONLY in #tslp — the inbox correctly excludes them.

## Living island (iLands parity layer)

- **Ambient engine** (`src/lib/api/activity.ts` + `src/lib/chatter.ts` +
  `src/lib/sim-engine.ts`): friend-first replies within seconds, staggered
  crowd replies, like showers, spontaneous persona posts, persona↔persona
  DMs, random check-in DMs. Every path prefers the live endpoint (freshly
  re-resolved client, never the stale boot client) and degrades to honest
  offline pools labelled `origin: 'offline'`.
- **Memory with consent**: persona memory proposals → `pending_memories` →
  user approval in Settings before permanent.
- **Simulation controls** (Settings): Friend Ping, Weekly Spawn (1500-persona
  cap, named spawns), demo-event rotation, Gazette ("while you were away"
  24h digest).
- **#tslp admin** (`/tslp`): all-persona phone grid, per-persona phone view
  (Posts / DMs w/ you / DMs w/ island + stats), favorites, global + favorite
  dashboards, friend creator. Full spec: `docs/features/tslp-admin.md`.

## Models & providers

- **Models hub** (`ModelsPage.tsx`): HF catalogue with [CHAT]/[IMAGE]/[CAPTION]
  badges, GGUF download with resume + parent-folder creation, endpoint model
  discovery, test chat, browser-safe local runs.
- **Settings**: endpoint URL + Check (probe `/v1/models` → `/models` →
  `/health` → base), API key with [KEY STORED] indicator + Clear, model-id
  picker with Kilo `stepfun/step-3.7-flash:free` preset, Discover, test chat,
  ambient-engine status line (LIVE vs offline + last fallback reason).
- **Provider templates** (`ProviderSettings.tsx`): named chat/image/caption
  providers, each with own endpoint + key + model; Activate loads into the
  matching global slot. Secrets in Preferences/secure storage, never SQLite.
- **Native HTTP** (`src/lib/api/http.ts`): endpoint traffic via CapacitorHttp
  (no WebView CORS failures against Kilo); 429 single polite retry.
- **Ambient status** (`src/lib/api/ambient-status.ts`): last live/fallback
  diagnostic, surfaced in Settings.

## Trust, safety & data

- Mute / block / report; global muted-words list; `protected_posts` flag;
  `removeFollower` (`store.ts`).
- Export all data (JSON); Reset all data (with confirm). Storage indicator
  (native DB vs in-memory).
- Onboarding (manual URL), Legal, AppLock, ErrorBoundary, themes.
- SQLite is truth (append-only migrations, current SCHEMA_VERSION 17:
  `favorites` v14, `drafts` v15, `post_views` v16, `notification_reads`
  v17); filesystem holds blobs only.

## Brand & icon

- TSL neobrutalist tokens (`src/styles/`). App icon: black background,
  purple `#tsl` plate, yellow + purple overlapping hard shadows —
  `resources/icons/tsl-icon-512.png` (master) + Android mipmap densities +
  web `icons/` + manifest (added 2.1.0).
