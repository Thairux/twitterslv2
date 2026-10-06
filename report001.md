# REPORT001 — TwitterSL v2 (TSL): Complete Codebase Report

> Self-contained. No outside docs needed: everything an AI agent with NO
> repo or device access needs to know the app, its history, its screens,
> its data, its quality record, and where to take it next.
> Generated 2026-10-06 from the repository at release 2.1.0.

## 0. Snapshot (read this first)

- **What**: TSL ("TwitterSL") — a local-first fake-Twitter island sim. You
  live on an island of ~50 AI personas who post, reply, like, and DM you
  and each other, driven by a real LLM endpoint when configured or honest
  offline text pools when not. A hybrid of X.com (threads/quotes/counts),
  Threads (readable chains, Following discipline), and iLands (living
  personas, friend creator, admin surface).
- **Current release**: 2.1.0, Android versionCode 15, signed
  (CN=peter thairu muigai). SCHEMA_VERSION 17. 133 unit/integration tests
  green, 7 Playwright E2E green, `tsc` clean, production build green.
- **Stack**: Capacitor 6 + React 18 + TypeScript 5.6 + Vite 6 + SQLite
  (@capacitor-community/sqlite on native, Map-backed in-memory SQL fallback
  on web) + Zod + react-router-dom (HashRouter) + llama-cpp-capacitor.
- **One build serves all**: `npm run build` → `dist/`, consumed by browser
  and the Android shell via `npx cap sync android`.
- **Layers (strict inward)**: UI (`src/pages`, `src/components`, React
  only) → App (`src/lib/api`, use-cases) → Domain (`src/lib/domain`, pure
  TS: no Capacitor/SQLite/fetch) → Infra (`src/store`, `src/native`).
- **Ten invariants**: SQLite is truth (files hold blobs only); domain pure;
  Capacitor behind `src/native/*` with web fallback; API layer revalidates
  (Zod); friend always kind + first reply, never troll; secrets only in
  Preferences/secure storage; memory consent-gated + approval-bound;
  simulation never deletes user posts; no cloud egress/spend without
  explicit approval; append-only schema (additive migrations only).
- **Brand**: TSL neobrutalist (black + purple `#7b2ff7` + yellow `#f5d90a`,
  hard offset shadows). The string AGY must never appear. App icon: black
  field, purple `#tsl` plate, yellow + purple overlapping shadows
  (`resources/icons/`, Android mipmaps, web manifest).
- **Docs folder**: the repo docs live in `twitterslv2 docs/` (renamed from
  `docs/` so the Obsidian vault name is unique).

## 1. Every screen and every button (UI workflow)

Shell (`src/App.tsx`): header (TSL logo → `/`; static `[SYNC OK]`;
Models → `/models`; Friend → `/friend`; Settings → `/settings`; TGL theme
toggle; Lock → PIN screen) + 5-tab bar (Home `/`, Search `/search`,
Notifications `/notifications`, Messages `/dms`, Me `/profile`) + 17
routes + 45s island heartbeat (`ambientBeat` + `randomDmBeat`, first beat
8s after boot) + `window.__tsl` debug hooks. Boot errors show Retry
(reloads page).

### `/` Feed (`FeedPage.tsx`) — main timeline
- Data on mount/tab change: For You → `socialStore.rankFeed('user')`;
  Following → `socialStore.listFeedFollowing('user')`; plus reply counts,
  view counts, island event banner; 20s live refresh.
- Controls: For You / Following tab buttons (local state + reload); event
  banner (display); per-post `PostCard` (body → `/post/:id`; Quote →
  `/compose?quote=ID` via `handleQuote`; poll Vote → `store.votePoll`;
  likers toggle; Like/Repost/Bookmark buttons); FAB `+`
  (`data-testid="compose-fab"`) → `/compose`.
- Empty: "No posts yet. Be the first to post, or visit Settings →
  Background Simulation for a friend ping."

### `/post/:id` Thread (`ThreadPage.tsx`) — post + nested replies
- Loads `socialStore.getThread(id)` (post + replies), persona names map,
  records a post view (best-effort). Reply tree: `topAncestor` follows
  `parent_reply_id` (cycle-guarded); top-level sorted newest/oldest
  (`thread-sort` toggle); `childrenOf` per top reply; per-subtree
  collapse (`collapse-<id>`, `＋/－ N`).
- Controls: header PostCard (Vote → `store.votePoll`, Quote →
  `/compose?quote=`); reply textbox (`reply-input`, Enter sends);
  Reply send (`reply-send`) → `store.createReply({authorId:'user',
  parentReplyId})` + reload; cancel-parent `× name`; per-reply Reply
  buttons (`reply-to-<id>`, set reply target); per-reply LikeButton;
  collapse toggles; child rows show `→ direct-parent name` (not top
  ancestor). Missing: "Missing post id." / "Post not found."

### `/compose` Compose (`ComposePage.tsx`) — new / quote / edit / poll
- Modes from query: `?quote=ID` (loads quoted preview), `?edit=ID`
  (owner-only, pre-fills body, title "Edit Post"); else new post with
  draft restore (`draft-restored` banner + `draft-discard`).
- Controls: body textarea (`MAX_POST_LEN`=280, live `n/280` counter);
  file picker → `nativeFiles.saveBlob('media/...')` + 48px preview;
  image-URL input (https-only on submit); AI prompt + Generate →
  `generateImage()` (attaches only real local-model output); poll
  question + options (add 140-char Q, 80-char options, add/remove,
  min 2); Post/Update (disabled when empty/saving) → `store.createPost`
  (+ `store.createPoll` + fire-and-forget `respondToPost` for
  friend-first replies + `deleteDraft`) → edit→`/post/:id`,
  quote→`/post/:quoteId`, new→`/`; Cancel → history back.
- Draft autosaves after 1s idle (new-post mode only).

### `/profile` Me (`ProfilePage.tsx`) — own profile
- Avatar (upload → `avatars/...` blob, circle 80px) + Edit/Save/Cancel
  (name ≤24, bio ≤160 → `store.updateUserProfile`); Posts count (static);
  Following/Followers count buttons (switch tabs); tabs Posts/Bookmarks/
  Following/Followers/Media (Media = posts with image).
- `#tslp` entry card (`profile-tslp-entry`, brand plate) → `/tslp`.
- Lists: following rows (tap/​Message → `/messages/:id`, Unfollow →
  `store.unfollow`); follower rows (Message → DM, Follow back →
  `store.follow`, Remove → `store.removeFollower`). PostCards support
  Edit (`/compose?edit=`) and Quote.

### `/persona/:id` Persona (`PersonaPage.tsx`) — stranger profile
- Header (avatar initial, name, @handle, bio); Follow/Unfollow;
  ☆/★ favorite (`persona-fav-<id>` → `store.toggleFavorite`);
  Mute/Unmute; Block/Unblock with two-tap confirm ("Blocking also
  unfollows and removes them as a follower" → `socialStore.blockPersona`);
  Message → `/messages/:id`; report reason input + Report →
  `store.report('persona', id, reason)` → "Report submitted."
- Their posts as PostCards (Like/Repost/Bookmark active; no Quote/Edit/
  Vote). Empty: "Persona not found." / "No posts yet."

### `/notifications` Alerts (`NotificationsPage.tsx`)
- Aggregates: replies to my posts (top 10), likes/reposts on my posts
  (last 60 reactions, deduped, cap 30 items), newest 5 followers, quotes
  of my posts (last 20), DM inbox top 10. Every row deep-links
  (`/post/:id`, `/persona/:id`, `/messages/:id`); tap →
  `store.markNotificationRead(id)` + navigate; unread rows show `New:`
  + accent border; title counts unread.
- Prefs (persist immediately per toggle): chat notifications, mention
  notifications, quiet-start/quiet-end time inputs (local only).
- Empty: "No notifications yet."

### `/dms` Inbox (`DMsPage.tsx`) — user threads only
- 15s live refresh via `dmStore.listInbox('user')` (persona↔persona
  threads excluded by `user:` prefix) + favorites set.
- Controls: `+ New DM` → `/search?tab=personas`; ★ Favorites filter
  toggle (count badge); thread rows → `/messages/:personaId` (avatar,
  ★, name, `You:`-prefixed snippet, `● NEW` unread badge
  `inbox-unread`, relative time). Empty: "No messages yet."

### `/messages/:id` Chat (`FriendPage.tsx`) — 1:1 thread
- Loads persona (missing → `/dms`), thread DMs, marks read, loads
  `seen:` cursor; empty thread → one session-guarded greeting from the
  persona (never silent). Auto-scroll, right=me/left=them, `Seen` under
  own messages up to cursor, `Friend is typing…` while replying.
- Send: input + Enter/Send → `store.createDm` (optimistic) → 0.8–2.2s
  pause → `draftFriendReply` (live endpoint client built fresh from
  storage + explicit model; offline pool fallback) → `store.createDm`
  + `setAgentConfig('seen:…')`. States: Loading… / Persona not found. /
  Say hello! / typing.

### `/friend` Resolver (`FriendRoute.tsx`) — no controls
- Reads `agent_config primary_friend_id` (default `persona-friend`/Mimi)
  → redirects to that `/messages/:id`. Shows "Finding your friend…".

### `/models` Hub (`ModelsPage.tsx`, 495 lines) — HF + local + endpoint
- Tabs Search / Catalogue / Downloads. Search: query + Go →
  `modelService.search()` → cards with Open (huggingface.co \@blank),
  Files (embedded GGUF list), Download/Cancel/Resume + progress
  `X/Y MB (pct%)`. Catalogue: auto-loads `listCatalogue()` with
  `[CHAT]/[IMAGE]/[CAPTION]` badges (`catalogue-type-<id>`), same
  file/download actions. Downloads: `listDownloads()` + progress,
  Delete, Resume. Red error banner on failures.

### `/settings` Config (`SettingsPage.tsx`, 673 lines)
- Model Endpoint URL + Check (probes `/v1/models` → `/models` →
  `/health` → base; `[OK]/[ERR]`); auto-discovery per endpoint value;
  API key (password, Clear, `[KEY STORED]`); image/caption sidecar
  endpoints; links to Models tab + `#tslp admin` (`settings-tslp-link`).
- Model Selector: current selection display; Model ID input + Use
  (`setSelectedModel`); Kilo preset button
  (`stepfun/step-3.7-flash:free`); Send test chat (persists
  endpoint+model, chats "Reply with exactly: OK" → `test-result`);
  Run local model (`runLocalModel` → `[on-device]`/`[browser-sim]`);
  Ambient engine status line (`ambient-status`: LIVE vs offline + last
  fallback reason + Refresh).
- Endpoint Models (Discover + list + Select), Downloaded Local Models
  list, ProviderManager (named chat/image/caption templates, each own
  endpoint+key+model; Add/Use/Edit/Del/Save/Discover/Select),
  image/caption ModelKindPickers, storage backend indicator, Export
  Data (JSON download), Reset All Data (red confirm → wipe + reload),
  memory consent checkbox + pending-memory approvals, protected-posts
  flag, muted words add/remove, Friend Ping / Weekly Spawn sim buttons
  with sim log, Save Configuration (endpoint+key+model+profile+flags).

### `/search` Search (`SearchPage.tsx`) — posts/personas/tags/DMs
- Query input (250ms debounce) + Go (`searchTrigger`); tabs
  Posts/Personas/Tags/Dms; Posts filters: Media only, Last 24h,
  From-handle (`search-from`); results as PostCards (Quote → compose,
  Vote → `store.votePoll`).
- Personas: ★ Favorites filter; Who-to-follow suggestions (≤5 shuffled
  unfollowed) when query empty; rows → `/messages/:id` (`dm-open-<id>`),
  ☆/★ (`fav-btn-<id>` → `toggleFavorite`), Follow/Following
  (`follow-btn-<id>`). Tags: top-20 hashtag counts. DMs:
  `dmStore.searchDms` rows (sender + time + body).

### `/chatter` (`ChatterPage.tsx`) — ranked read-only feed
- No controls. `rankFeed('user')` + names map → PostCards with
  authorName. "Loading…" / "No chatter yet."

### `/gazette` (`GazettePage.tsx`) — while-you-were-away 24h digest
- No controls except links. `rankFeed` filtered to last 24h; rows show
  author name + time link + body link → `/post/:id`. "Nothing new in
  the last 24 hours."

### `/onboarding` (`OnboardingPage.tsx`) — manual-URL 3-step wizard
- Step 1: 16+ and rules checkboxes (both required → Next). Step 2:
  how-it-works (Feed/Compose/Models/Settings) + Back/Next. Step 3:
  first-action cards + Back / Get Started → `/`. No store writes.

### `/legal` (`LegalPage.tsx`) — Privacy/Terms tabs + Close → `/`.

### `/tslp` Admin (`TslpPage.tsx`, 513 lines) — twitter sl personas
- Brand plate (purple `#7b2ff7`, yellow shadow, full name). Tabs All /
  ★ Favs / Stats / ＋ Friend (`tslp-tab-*`); filter input
  (`tslp-filter`, name/handle/role); cards (`tslp-card-<id>`, avatar +
  name + role + @handle, tap → phone-view modal) + ☆/★
  (`tslp-fav-<id>` → `toggleFavorite`).
- Stats: global today card (`tslp-global-stats`: posts, replies, likes,
  DMs to you / to personas / from you) + per-favorite cards
  (`tslp-favstat-<id>`).
- Friend creator (`friend-creator`): description textarea (≤500,
  `friend-desc`) → Generate (`friend-generate`) → preview
  (`friend-preview`, shows via glimmer/offline) → Confirm
  (`friend-confirm`) → persona + both-way follow +
  `primary_friend_id` → `/messages/<newId>`.
- PersonaDetail modal (`tslp-detail-<id>`): identity header + stats
  strip; tabs Posts (last 20) / DMs w/ you (full `user:` thread, both
  directions) / DMs w/ island (non-`user:` threads involving them,
  segment-matched, last 30); Close + ☆; backdrop closes.

### Shared components (`src/components/`)
- `PostCard` (298 lines): header (avatar initial, name, @handle,
  `timeAgo`, `[*]` AI mark); body link (280-truncate, `[edited]`);
  OG link preview; media (blob/URL/placeholder); quote embed card
  (`quote-card-<id>`, resolved author name) or `Quoted post: <id>`;
  poll box (question, vote bars summing to 100%, Vote/Voted);
  actions (♥ likers toggle + list, ↻ count, 👁 views, 💬 reply-count
  link, owner Edit, Quote, Like/Repost/Bookmark buttons).
- `LikeButton` (♡/♥, `like-btn-<id>`), `RepostButton` (↻,
  `repost-btn-<id>`), `BookmarkButton` (☆/★, `bookmark-btn-<id>`):
  mount-check + toggle + optimistic flip + `onChange`.
- `ComposerSheet`: textarea + image-prompt + remaining count + Post →
  `store.createPost` (+ placeholder image) + `onPosted`.
- `ProviderSettings`: `ProviderManager` (add/use/edit/del/save/
  discover/select per provider) + `ModelKindPicker` (image/caption
  cloud + local pickers).
- `Theme` (dark/light via `tsl-theme`, `data-theme`), `AppLock`
  (PIN, default 0000, `tsl-app-lock-code`), `ErrorBoundary`
  (Something went wrong + Retry), `BirdLogo` (SVG mark).

## 2. Data layer — fresh-install database (SCHEMA_VERSION 17)

SQLite is truth; filesystem/IndexedDB holds blobs only (paths in DB).
Secrets NEVER in SQLite (Preferences/secure storage, `tsl-*` keys on web).
Web fallback driver: single-table SELECT only, no JOIN/GROUP BY — all
dashboard grouping happens in JS. Migrations append-only
(`src/store/migration-defs.ts`); never edit merged SQL.

### v1 baseline tables (19)
- `personas(id PK, handle UNIQUE, display_name, role
  [friend|fan|peer|meme|troll|news], vibe='', bio='', avatar_seed='',
  affinity REAL 0.5, active 1, spawned_week 0, created_at)` — ~50 seeded
  + Mimi `persona-friend`; 3 friend-role seeds (coral, persona-friend,
  pearl); `primary_friend_id` in agent_config picks THE friend.
- `posts(id PK, author_id [persona|'user'], body, image_path,
  image_prompt, created_at, likes 0, reposts 0, origin ['glimmer'|
  'offline'] default glimmer, quoted_post_id NULL, ai_generated 0,
  edited 0)`.
- `replies(id PK, post_id→posts, author_id, body, image_path,
  reply_order [friend is 0 on user posts], created_at, origin)` +
  v11 `parent_reply_id NULL` (nested threads).
- `reactions(id PK, post_id→posts, persona_id→personas, kind
  [like|repost], created_at, UNIQUE(post_id,persona_id,kind))`.
- `dms(id PK, thread_id [`user:<pid>` = with you;
  `agent:<a>:<b>` = island-only], sender_id, body, image_path,
  created_at, origin)`.
- `memories(id PK, persona_id→personas, fact, embedding_ref [vector ref
  only], consented 0, created_at)` + `pending_memories(id PK,
  persona_id, fact, source='', created_at)` (approval queue).
- `follows(persona_id PK, created_at)` (I follow) /
  `followers(persona_id PK, created_at)` (v10, follow me) /
  `mutes(persona_id PK, kind='mute', created_at)` /
  `blocks(persona_id PK, created_at)` / `muted_words(word PK,
  created_at)` (v6, global list) / `reports(id PK, target_type,
  target_id, reason, created_at)` (write-only review log).
- `bookmarks(id PK, post_id, created_at INTEGER)` (private saves).
- `polls(id PK, post_id, question, created_at)` (v7) /
  `poll_options(id PK, poll_id, label, votes 0)` /
  `poll_votes(poll_id, persona_id, option_id, created_at,
  PK(poll_id,persona_id))` (v9, one vote each).
- `downloaded_models(id PK, repo, path, size_bytes, rec_ram_gb)` /
  `download_progress(id PK, repo, filename, path, size_bytes,
  downloaded_bytes 0, status='downloading', updated_at)` (v5).
- `generated_images(id PK, prompt, path, owner_id, created_at)`.
- `providers(id PK, name, kind ['chat'|'image'|'caption'] default chat,
  selected_model NULL, active 0, created_at)` (v13).
- `favorites(persona_id PK, created_at)` (v14, X-Lists-lite).
- `drafts(id PK, body='', quote_id NULL, updated_at)` (v15, composer
  autosave, key `compose-main`).
- `post_views(post_id, viewer_id, viewed_at; NO unique pair — counts =
  opens)` (v16) + `idx_post_views_post`.
- `notification_reads(id PK, read_at)` (v17).
- `user_profile(id=1, display_name 'You', handle '@you', bio '',
  avatar_path NULL)` / `agent_config(key PK, value)` (memory_consent,
  protected_posts, primary_friend_id, `seen:<threadId>`, notification
  prefs, spawn cursors) / `spawn_state(id=1, current_week 0,
  total_spawned 10)` / `world_events(id PK, title, detail'',
  starts_at, ends_at)` / `dm_reads(thread_id PK, last_read_at)`.
- Baseline indexes: `idx_posts_created`, `idx_replies_post`,
  `idx_dms_thread`, `idx_memories_persona`, `idx_events_time`;
  v8 adds poll/mute/image indexes. v3/v4 intentionally empty reserved.
- `posts.image_url` added v12 (remote URLs vs `image_path` blobs).

### Endpoint contract (ModelClient, `src/lib/api/model-client.ts`)
- Base normalized (trim, default https, strip `/`); chat POSTs
  `{base}/v1/chat/completions` with `{model?, messages}` + Bearer key,
  30s timeout; 401/403→AuthError, 429→one retry then RateLimitError,
  else ConnectionError; malformed→ParseError. Probe tries
  `/v1/models` → `/models` → `/health` → base (reports which answered).
- Traffic via CapacitorHttp on native (no CORS/preflight vs Kilo);
  plain fetch + abort timeout on web; one retry on network blip.
- Sidecars: image-gen `{base}/caption`-style POSTs (`image.ts`,
  `vision.ts` describeImage); local GGUF via llama-cpp-capacitor
  (`native/inference.ts`), browser-simulated with `simulated:true`
  when the bridge is absent.

### Seeds (`src/store/seeds.ts`, 632 lines)
~50 hand-written personas (never content/posts — seeds are people only):
id/handle/displayName/role/vibe/bio/avatarSeed/affinity/active/
spawnedWeek. Includes Mimi `persona-friend` (primary), coral + pearl
(extra friends), fans/peers/memes/trolls/news. Weekly spawn grows
toward WORLD_CAP=1500 with named spawns (`domain/world.ts`).

## 3. Engine + file guide (what each file does)

- `src/App.tsx` (194): boot (`bootstrap()`), heartbeat, header/tabbar/
  router, lock, boot-error Retry. `src/main.tsx`: root render.
- `src/lib/api/activity.ts` (241): `respondToPost` (friend-first +
  staggered crowd + like rain), `ambientBeat` (45s posts/replies/likes
  + 30% island DMs), `randomDmBeat` (35% check-in), always-fresh
  `resolveAmbientClient` (never trusts boot client).
- `src/lib/api/ambient-status.ts` (36): in-memory live/fallback
  diagnostic (`noteAmbientLive/Fallback`, `getAmbientStatus`).
- `src/lib/api/bootstrap.ts` (48): opens DB, builds Store/SocialStore/
  DmStore/Secrets/ModelService, seeds, boot ModelClient WITH selected
  model + normalized endpoint.
- `src/lib/api/store.ts` (919): Zod-validated Store — ~70 methods
  (personas, follows, favorites, drafts, views, mutes/blocks, words,
  posts/replies/reactions, bookmarks, providers, memories, profile,
  config, spawn, downloads, polls). `src/lib/api/db.ts`: Database
  wrapper (run/query/transaction).
- `src/lib/api/social-store.ts` (121): feed/search/likes use-cases
  (`rankFeed`, `listFeedFollowing`, `getThread`, `searchPosts/Personas`,
  `getPoll`, toggles, `blockPersona` = block+unfollow+removeFollower,
  `listLikers/Reposters`, `getReplyCounts`).
- `src/lib/api/dm-store.ts` (187): `getThread`, `sendMessage`,
  `markRead`, `listInbox` (user: threads only, unread flags),
  `searchDms`.
- `src/lib/api/stats.ts` (104): `personaStats`, `todayStats`
  (single-table + JS, likes day-filtered).
- `src/lib/api/model-client.ts` (229) + `http.ts` (80) +
  `models.ts` (264, HF catalogue/downloads) + `hf.ts` (84, HF API) +
  `local-inference.ts` (129) + `persona-generator.ts` (71, theme→JSON
  persona, `allowFriend` lifts friend ban) + `secrets.ts` (86, delegates
  to native) + `seed.ts` (56, seeds + primary_friend_id) +
  `export.ts` (32, JSON dump) + `image.ts`/`images.ts`/`vision.ts`/
  `newspaper.ts`/`opengraph.ts` (sidecars/unfurl) + `posts.ts`
  (intentionally empty pointer) + hooks `use-blob-url`,
  `use-persona-names` (27, shared names map), `use-polls`,
  `use-poll-votes` + `index.tsx` (ApiProvider, useApi/useStore/
  useNativeFiles/useModelClient).
- `src/lib/sim-engine.ts` (122): offline pools + `replyToUserPost`
  (friend-first, per-reply honest origin). `src/lib/chatter.ts` (100):
  `ambientTick` (posts), `personaToPersonaDms` (honest origin).
  `src/lib/background.ts` (56): `onResumeTick`/`friendPing`/
  `weeklySpawn` (live-resolving, honest origin).
- `src/lib/config.ts` (174): cached endpoint/key/sidecars/models +
  `refreshConfig()`. `src/lib/domain/`: `persona.ts` (roles,
  FRIEND_ID, validation, troll-line guard), `post.ts` (makePost,
  orderReplies, 280 chars, 15-min edit window), `social.ts`
  (rankFeed, tags, mute filter, search), `engine.ts` (offline pools +
  real photo/article URLs), `world.ts` (WORLD_CAP=1500, spawn weeks,
  visibility), `sql.ts` (statement splitter).
- `src/native/`: `db.ts` (517, Capacitor-SQLite + Map-backed web
  engine, user_version), `secrets.ts` (262, Preferences/secure +
  `tsl-*` localStorage, per-provider keys), `files.ts` (230, blobs),
  `inference.ts` (83, llama.cpp + browser sim), `notifications.ts`
  (70, channels/quiet hours), `background.ts` (42, stub), `__mocks__/`.
- `src/store/`: `schema.sql` (baseline DDL), `migration-defs.ts`
  (registry, SCHEMA_VERSION 17), `migrations.ts` (runner),
  `schema.ts` (catalogue), `seeds.ts` (personas).
- `src/styles/`: `tokens.css` (neobrutalist TSL tokens),
  `themes.css` (dark/light). `src/types.d.ts`, `vite-env.d.ts`.
- `agents/`: 17 skills (incl. release-manager), 12 rules (00–12),
  hook (`post-file-change-hook.js` → vault sprint log),
  `skills-lock.json`, prompts README. Mirrors: `.agents/skills/`,
  `.claude/skills/` (aboutrepo, definition-of-done, design-tokens,
  invariants + READMEs). `.agents/`: `hooks.json`, `verify-release.js`
  (package.json = gradle versionName = releases/ dir check).
- `alldemos/`: `ocdemo/` (TSL UI truth: DEMO.md + 9 screens + avatars),
  `agydemo/` (frozen v1 reference). `assets/`: bird SVGs.
  `resources/icons/`: TSL icon SVG + 512/1024 PNG. `public/`:
  favicon + web icons + manifest. `scripts/`: README, check-order.js,
  verify-sprint.ps1. Root configs: package.json (scripts dev/check/
  test/test:e2e/build/lint/release:verify/cap:*), capacitor.config.ts
  (`com.twittersl.island`, webDir dist), ts/grunt/vite/vitest/
  playwright configs, `explore.mjs`, `inspect-state.mjs`.
- `android/`: Gradle shell (versionCode 15, versionName 2.1.0, signed
  via untracked `keystore.properties` + `twittersl-release.keystore`),
  mipmaps incl. TSL icon, splash, MainActivity. `releases/<ver>/`:
  APK + release-notes + manifest + quality-summary per version.

## 4. Evolution — every commit, day one to now (all by Peter Thairu Muigai)

2026-10-01 scaffold day (22 commits, repo assembled file-group by file-group):
- `ea26cc0` .gitignore/opencode.json/package-lock/quality-manifest/tsconfig;
  `42482dc` package.json; `b555e6b` docs scaffold (42 files: README,
  architecture/backend/domain/features/frontend/getting-started docs,
  bugs/improvements/regressions trackers, roadmap, sprint-history 00+07,
  sprints 01–08, workflow, exploration findings); `8bb49b6` .agents
  mirrors; `0934dc3` .claude mirrors; `f61899d` agents/ (hook, prompts,
  rules 00–11, 15 skills, lockfile); `28ab4f9` alldemos (agydemo frozen +
  ocdemo TSL rebrand + DEMO.md); `fa441df` bird SVGs; `22f5654` releases
  scaffold; `585045a` root configs (AGENTS/HANDOFF/capacitor/index/
  inspect/masterplan/playwright/vite/vitest); `1dfdd00` scripts;
  `df39869` App.tsx; `7e8fad3` 7 components; `c3885a4` 36 lib files;
  `f486ccf` main.tsx; `915083a` 7 native files; `35d0109` 15 pages;
  `5ce7a6b` store (migrations/seeds/schema); `f6eb158` styles;
  `42c432c`/`9c26d8b` type decls; `ab60efb` 7 test files.
- Tracker-only passes: `854dea2`, `4c2a78e`, `aee331f` (HANDOFF),
  `8f5a94c`, `deb8293`, `6369bf6` (1.0.0 manifest), `d97580b`
  (models.ts), `5c59cbcd` (DMs/Models/Notifications/Search pages),
  `dbbc81b` (themes).
- `ebb3701` (Oct 4) Sprint 9 + release 1.0.0: Like/Repost buttons +
  components, model selector/discovery, onboarding, export/reset,
  `launch.ts` DELETED, sim-engine/config/secrets/vision/newspaper/OG/
  posts/social-store rework, Chatter→PostCard, Compose/Onboarding/
  Settings upgrades. Also added releases/0.2.0 + discovery002.
- `17f426f` (Oct 5) 1.0.3: release gate (`verify-release.js`, rule 12,
  release-manager skill), discovery0003/003, model discovery/catalogue/
  download UI, friend replies, Models/Settings/Feed/FriendPages,
  `native/inference.ts` NEW, app-exploration + model-client tests.
- `272a5b8` 1.0.4: NDK 28 override, first native llama APK (unsigned).
- `5a21df9` 1.0.5: Android shell tracked (gradles), FIRST SIGNED APK.
- `e679f40` 1.0.7 (also bundles 1.0.6 notes): downloads fix, endpoint
  probe, live client, FAB clamp, Kilo preset fix, 429 retry groundwork.
- `612ff7e` 1.0.8: CapacitorHttp native bridge (CORS-proof Kilo), key
  indicator, 429 retry + tests.
- `202ed33` 1.0.9: living island — `activity.ts` NEW (heartbeat engine),
  chatter/domain-world/seeds rework, Bookmark/Like/Repost buttons,
  Search tab, suggestions, vision catalogue, social-activity e2e NEW,
  activity unit test NEW.
- `97df05a` 1.0.10: DM nav, thread replies, rich offline voice pools,
  download parent-folder fix, live ambient client.
- `9326d4b` 1.0.11: inbox that shows (AS-alias web-SQL fix), nested
  comments, persona↔persona DMs, `http.ts` NEW, OG rework, world cap
  50→1500, named spawns, console-filter + gap-validation e2e.
- `a6f0d08` (Oct 6) 1.0.12: provider templates (`ProviderSettings`
  NEW), avatar upload, secure-storage Preferences fallback (key fix),
  config/secrets rework, migrations.
- `d59f55f`: CHANGELOG created. `e611441` (Oct 6) 2.0.0 hybrid
  migration: discovery doc, sprints A–H, migration masterplan, #tslp
  (`TslpPage` NEW, `FriendRoute` NEW, `stats.ts` NEW,
  `use-persona-names` NEW, `tslp.spec`/`tslp.test` NEW), schema
  v14–v17, notifications center, favorites, drafts, views, threading,
  safety, generator friend path.
- `51008b1` (Oct 6) 2.1.0: TSL icon set, web manifest, #tslp spec +
  inventory + gaps docs, ambient-honesty fix (`ambient-status` NEW,
  +8 tests), audit S-gaps, versionCode 15. `da5407c`: sprint-08
  history. `94b3465`: on-device verification record.
- Uncommitted working tree (not history): `twitterslv2 docs/` rename
  work, hook/inspect-state path fixes.

Release lineage (all have APK + notes + manifest; 2.x add
quality-summary): app-debug → 0.2.0 → 1.0.0 → 1.0.3 (unsigned) →
1.0.4 (native llama, unsigned) → 1.0.5 (first signed) → 1.0.6 →
1.0.7 (phone-bug fixes) → 1.0.8 (native HTTP) → 1.0.9 (living island)
→ 1.0.10 → 1.0.11 → 1.0.12 → 2.0.0 (hybrid, #tslp) → 2.1.0
(icon/docs/ambient honesty). GitHub: Thairux/twitterslv2, tags
1.0.9–2.1.0, 2.1.0 marked Latest.

## 5. Sprints, critiques, SQM runs (full record)

### Sprint history
- Sprint 0 (scaffold): structure + configs + skills/rules/hooks + ocdemo
  rebrand + masterplan + sprint files; verified zero AGY; awaited
  approval. DONE.
- Sprints 1–6 (per overview table): shell/tokens/router; storage +
  migrations + seeds; domain port + units; feed/thread/composer;
  profile/persona/bookmarks; DMs/friend/meter. All DONE.
- Sprint 7 (models/endpoint/settings): check/test/e2e/build green
  (99 tests, 4 e2e); verified catalogue repos (Qwen2.5-0.5B, Mistral
  7B v0.2/v0.3, Llama-3.1-8B); SQMG fixes (repo URL encoding, async
  Zod catalogue, cancel/resume, blob-cache, overflow wrap, Go wiring,
  New-DM routing, quiet-hour labels, tabbar centering, catalogue
  dedup). DONE.
- Sprint 8 (ambient + multimodal, current-sprint.md): sidecar endpoints
  in config/secrets/bootstrap/client, captionImage, describeImage,
  generateImage, friend-first replyToUserPost, newspaper/OG unfurl,
  persona synthesis, posts-stub removal, client in ApiContext. Checks
  green (99 vitest, 4 e2e at the time). IN PROGRESS per overview (work
  continued into releases 1.0.9–2.1.0).
- Sprint 08 history file (2.1.0): 39-file commit `51008b1`, checks
  (133 tests, 7 e2e), hook log, tag + GitHub Latest.
- Sprint plans on file: sprints/sprint-01..08 (early phase plans) +
  tslp-migration-A..I (A stubs, B safety, C notifications, D favorites,
  E #tslp read, F writes/creator, G threading+drafts, H presence+
  discovery, I icon/docs/ambient-honesty).

### Critiques (Loop 1) — all CLOSED unless noted
- IMP-001 CRITICAL: web adapter ignored OR IGNORE/REPLACE → fixed
  execInsert branching. IMP-002 CRITICAL: transaction bypass →
  adapter-tx flush + transactional poll/reaction/memory writes.
- IMP-003 HIGH: dm-store imported Infra type → local DmRow. IMP-004
  HIGH: web blob hangs/leaks → Promise.all, post-write cache, finally
  IDB close. IMP-005 MEDIUM: dead Go + no debounce → wired + 250ms.
- IMP-006 HIGH: catalogue overflow → wrap/flex/column. IMP-007
  MEDIUM: tabbar 4px overhang → centered shell-anchored. IMP-008
  MEDIUM: no Cancel → cancelIds + buttons.
- IMP-2.0-01 HIGH: triple friend identity → primary_friend_id +
  /friend resolver. IMP-2.0-02 HIGH: raw-id stubs → quote cards,
  names, poll % fix, parent labels. IMP-2.0-03 HIGH: hooks-after-
  return crash class → fixed. IMP-2.0-04 HIGH: AS-alias/ALTER web-SQL
  → 17 queries repaired. IMP-2.0-05 MEDIUM: stale clients → live
  resolution. IMP-2.0-06/07/08 LOW OPEN (deferred w/ approval):
  muted-word scopes, Chatter kept, manual onboarding.
- IMP-2.1-01 HIGH: no app icon → TSL set everywhere. IMP-2.1-02
  MEDIUM: stale docs → spec/inventory/gaps/sprint-I/CHANGELOG.
  IMP-2.1-03 MEDIUM: #tslp undiscoverable → Me-page entry card.
  IMP-2.1-04 LOW: dead likes:0 stub → removed.
- Exploration loop-2 findings (all later fixed): poll % bar (F-1/P-1),
  thread raw ids (T-1), ID collision theoretical (C-1), Go no-op
  (S-1), hardcoded follower 0 (P-2/P-3), Alerts-vs-DMs title (N-1),
  unawaited Settings/FriendPage writes (Set-1/D-1), raw SQL in
  component (Set-2), empty-avatar crash (D-2), optimistic Bookmark,
  unawaited seed, reply rows without avatars.
- Competitor verdict (X/Threads vs TSL): feed/compose/threads/
  like/repost/bookmark/quote/edit/polls/media/dm-search/mute/privacy/
  profile at parity; unique wins: background sim, model downloads,
  offline-first, event rotation. Medium gaps need cloud (push, real
  image gen, video, advanced ranking) — cut. 280 chars, no
  analytics/creator-tools/monetization are deliberate product calls.

### Bugs (Loop 2) — all CLOSED
- BUG-001 CRITICAL boot crash on secure-storage failure → try/catch +
  retry message. BUG-002 HIGH blob-URL leak → ref-tracked revoke.
- BUG-003 HIGH poll double-vote race → unique constraint + catch.
- BUG-004 HIGH catalogue overflow → wrap (measured 686/805/821/857).
  BUG-005 MEDIUM tabbar overhang → centering (exact 407.4/857.4).
  BUG-006 MEDIUM dead Go → trigger + input id + ?tab= support.
  BUG-007 MEDIUM no Cancel → cancelIds wiring. BUG-008 MEDIUM
  catalogue re-listed downloads → repo-name dedup. BUG-009 LOW silent
  catalogue failure → error state. BUG-010 MEDIUM +New DM dead-end →
  /search?tab=personas. BUG-011 LOW unlabeled quiet-hours → labels.
- 2.0.0 field bugs: missing inbox threads (alias+fallback+refresh),
  no composer (inline reply box), download parent-folder (recursive),
  vanishing API key (Preferences fallback), generic posts (rich pools
  + verified media), half-offscreen FAB (clamp), wrong Kilo model id
  (stepfun/ prefix), hardcoded follower 0 (real tabs).
- 2.1.0: BUG-2.1-01 HIGH endpoint-OK-but-offline (live re-resolution
  + honest origins + status line + 8 tests); BUG-2.1-02 dashboard
  likes all-time → day-filter; BUG-2.1-03 raw ids (thread root,
  Chatter, quotes) → resolved names; BUG-2.1-04 inbox unread dot;
  BUG-2.1-05 island-DM substring matcher → segment match.

### Regressions (Loop 3) — all CLOSED, 0 open
- REG-004..009: catalogue geometry, tabbar geometry, Go, Cancel,
  New-DM routing, quiet-hour labels — all re-measured green.
- 2026-10-03 SQM pass: discovery-only, all loops green, no new
  findings. 2.0.0 gate: 124 unit + 7 e2e green; intentional changes
  re-specced first (WORLD_CAP→1500, richer pools, wider
  notifications, Search tab).

### SQM machinery (how quality runs here)
- `quality-manifest.json`: loops 1–3 (30 iterations each) → trackers
  (`twitterslv2 docs/improvements|bugs|regressions.md`), build/test/
  typecheck/lint commands, release dir, severity policy (HIGH/MEDIUM
  must close; LOW needs explicit approval), regression memory
  (retire after 3 versions). Finding lifecycle:
  OPEN→ASSIGNED→FIXED→VERIFIED→CLOSED.
- Per release: `releases/<ver>/` gets APK + release-notes.md +
  release-manifest.json + quality-summary.json; `release:verify`
  enforces package.json = gradle versionName = releases dir.
- Verification loop every change: check → test → e2e → build →
  assembleRelease → apksigner → adb smoke → logcat FATAL sweep.

## 6. Current blockers, bugs, open items (as of 2.1.0)

- NO open HIGH/MEDIUM. Three approved LOWs remain OPEN: global-only
  muted words (no per-surface scope/expiry), Chatter kept as a
  feed-adjacent route, onboarding manual-URL only. All recorded with
  standing user approval in release notes.
- Deferred by design (needs explicit user go-ahead): reply-audience
  gating (`reply_control` — no schema built), first-run auto-route,
  stats full-scan scale (fine at island scale; revisit near 1500-cap
  growth), `post_views` non-UNIQUE pair (counts = opens, as displayed).
- Cut list (do NOT build without product reversal): group DMs,
  Communities/Spaces, restrict tier, federation/cloud sync, token
  economy, E2E encryption, video/GIF pipeline, FTS5, edit history,
  push notifications, cloud image gen, analytics egress, monetization.
- Process caveats: `npm run lint` is vestigial (no eslint installed —
  `tsc` is the real gate); `docs/`→`twitterslv2 docs/` rename in
  progress (skills/rules/hooks verified; historical 0.2.0 manifest
  keeps old paths); 23MB session transcript JSON sits untracked at
  repo root (excluded from commits); keystore + passwords untracked
  (signing works locally only).

## 7. Future aspirations + delegated work (brainstorm from here)

Approved direction, unbuilt: per-post reply audience
(everyone/followed/mentioned) with composer selector + persona
gating; onboarding auto-route + copy refresh (DMs/Search/personas/
#tslp/creator); muted-word scopes + durations; report review queue UI;
Search/DM cross-links into #tslp; Gazette summarization (name
promises more than a raw 24h list); thread multi-post composer;
poll durations; DM image send (schema already supports imagePath);
affinity display/history; stat counters or pagination before post
volume grows; Chatter decision (differentiate with a real query or
delete route + file); iOS shell build (never attempted — macOS +
Xcode needed); first-run seed flag; export covering new tables audit
per migration. Hard rules for any new work: local-first (no spend/
egress without explicit approval), single-table + JS-join queries,
append-only schema, Zod at the API boundary, tokens (no ad-hoc
colors), friend-kind-first, consent-gated memory, tests green day 0.

## 8. Full folder structure (all files, sizes; build outputs and
node_modules omitted; 23MB session transcript excluded)

```
twitterslv2/
  .gitignore (105 bytes)
  AGENTS.md (3373 bytes)
  CHANGELOG.md (3949 bytes)
  HANDOFF.md (1651 bytes)
  README.md (1396 bytes)
  capacitor.config.ts (707 bytes)
  discovery0003.md (3282 bytes)
  discovery002.md (7643 bytes)
  discovery003.md (3282 bytes)
  explore.mjs (1826 bytes)
  index.html (757 bytes)
  inspect-state.mjs (698 bytes)
  masterplan.md (4062 bytes)
  masterplanilandsmigration.md (7078 bytes)
  opencode.json (354 bytes)
  package-lock.json (121607 bytes)
  package.json (1422 bytes)
  playwright.config.ts (539 bytes)
  quality-manifest.json (1905 bytes)
  tsconfig.json (662 bytes)
  vite.config.ts (701 bytes)
  vitest.config.ts (361 bytes)
  .agents/
    hooks.json (253 bytes)
    verify-release.js (2583 bytes)
    skills/
      README.md (342 bytes)
      aboutrepo/SKILL.md (807 bytes)
      definition-of-done/SKILL.md (955 bytes)
      design-tokens/SKILL.md (706 bytes)
      invariants/SKILL.md (831 bytes)
  .claude/
    skills/
      README.md (201 bytes)
      aboutrepo/SKILL.md (807 bytes)
      definition-of-done/SKILL.md (955 bytes)
      design-tokens/SKILL.md (706 bytes)
      invariants/SKILL.md (831 bytes)
  .opencode/
    commands/
  agents/
    skills-lock.json (931 bytes)
    hooks/post-file-change-hook.js (1081 bytes)
    prompts/README.md (299 bytes)
    rules/00-filesystem-truth.md, 01-aboutrepo-mandatory.md,
      02-dependency-direction.md, 03-new-file-and-sqlite-truth.md,
      04-domain-purity.md, 05-model-provider-contract.md,
      06-friend-invariant.md, 07-secrets-consent.md,
      08-design-tokens.md, 09-demo-source-of-truth.md,
      10-verify-before-done.md, 11-session-continuity.md,
      12-release-apk-version.md (254–632 bytes each)
    skills/aboutrepo, architecture, background-notify,
      capacitor-frontend, definition-of-done, demo-source-of-truth,
      design-tokens, dm-engine, feed-engine, gap-critique, handoff,
      invariants, model-provider, persona-engine, release-manager,
      sqlite-persistence, testing-strategy (SKILL.md 433–1041 bytes)
  alldemos/
    agydemo/ (frozen v1: dms/feed/friend/index/models/notifications/
      post/profile/settings.html + 4 avatar SVGs)
    ocdemo/ (TSL truth: DEMO.md + same 9 screens + 4 avatar SVGs)
  android/ (Gradle shell: gradles, keystore untracked, versionCode 15 /
    versionName 2.1.0, app/src/main: AndroidManifest, MainActivity.java,
    assets/public [synced dist + icons + manifest], java, res
    [drawable splash, layout, mipmap-anydpi-v26 + mipmap-mdpi→xxxhdpi
    TSL icons, values, xml], cordova plugins, gradle wrapper)
  assets/bird.svg, bird-stitch.svg
  public/favicon.ico, manifest.webmanifest, icons/icon-192|512.png
  releases/ (per version: APK + release-notes.md + release-manifest.json
    [+ quality-summary.json on 2.x]; versions: app-debug, 0.2.0, 1.0.0,
    1.0.3, 1.0.4, 1.0.5, 1.0.6, 1.0.7, 1.0.8, 1.0.9, 1.0.10, 1.0.11,
    1.0.12, 2.0.0, 2.1.0, sqmg-models-1.0.0)
  resources/icons/tsl-icon.svg, tsl-icon-512.png, tsl-icon-1024.png
  scripts/README.md, check-order.js, verify-sprint.ps1
  src/
    App.tsx (7939) main.tsx (433) types.d.ts vite-env.d.ts
    components/ AppLock, BirdLogo, BookmarkButton, ComposerSheet,
      ErrorBoundary, LikeButton, PostCard (11817), ProviderSettings
      (18843), RepostButton, Theme
    lib/ background, chatter, config, daily, memory-extract,
      sim-engine, world-events
    lib/api/ activity, ambient-status, bootstrap, db, dm-store,
      export, hf, http, image, images, index, local-inference,
      model-client, models, newspaper, opengraph, persona-generator,
      posts (empty pointer), secrets, seed, social-store, stats,
      store (34643), use-blob-url, use-persona-names, use-poll-votes,
      use-polls, vision
    lib/domain/ engine, persona, post, social, sql, world
    native/ background, db (18676), files, inference, notifications,
      secrets, __mocks__/background-task + secure-storage
    pages/ Chatter, Compose (9726), DMs, Feed, Friend (8066),
      FriendRoute, Gazette, Legal, Models (21551), Notifications,
      Onboarding, Persona, Profile (13338), Search (12542), Settings
      (27165), Thread, Tslp (19424)
    store/ migration-defs (SCHEMA_VERSION 17), migrations,
      schema.sql, schema.ts, seeds (50 personas)
    styles/ themes.css, tokens.css
  tests/
    e2e/ app-exploration, console-filter, feature-exploration,
      gap-validation, golden-path, social-activity, tslp,
      user-exploration specs
    integration/ storage.test.ts
    unit/ activity, ambient-honesty (8), domain (97), model-client,
      order-debug, tslp tests
  twitterslv2 docs/ (Obsidian vault: AGENTS, CHANGELOG, HANDOFF,
    README, bugs, competitor-gap-analysis, discovery0003/002/003,
    implementation-plan, improvements, masterplan,
    masterplanilandsmigration, regressions, user-exploration
    findings ×2, architecture/, backend/, diagrams/, domain/,
    features/ [app-features, tslp-admin + 5 stubs], frontend/,
    getting-started/, inprogress/ [COPILOT_HANDOFF, ilands-discovery,
    session file, tslp-gaps], roadmap/, sprint-history/ [current,
    overview, 00, 07, 08], sprints/ [01–08 + migration A–I],
    workflow/)
```

## 9. Appendix — commands, tests, glossary

- Commands: `npm install` · `npm run dev` (:5173) · `npm run check`
  (tsc) · `npm run test` (vitest: 133) · `npm run test:e2e`
  (playwright: 7) · `npm run build` (tsc + vite) · `npx cap sync
  android` · gradle `assembleRelease` + apksigner + adb install/smoke.
- Test files: unit activity/ambient-honesty/domain(97)/model-client/
  order-debug/tslp(+likes-day-filter); integration storage (both
  drivers); e2e golden-path/social-activity/tslp/gap-validation/
  feature/app/user-exploration (+console-filter, no-pageerror rule).
- Glossary: `origin` glimmer=endpoint-made, offline=pool-made;
  thread `user:<pid>` = with you, `agent:<a>:<b>` = island-only;
  roles friend/fan/peer/meme/troll/news (troll lines allow-listed,
  friend never trolls); `seen:<threadId>` = read cursor; FRIEND_ID =
  `persona-friend` (Mimi) unless `primary_friend_id` overridden;
  WORLD_CAP 1500; EDIT_WINDOW 15 min; heartbeat 45s (8s kickoff);
  inbox refresh 15s; feed refresh 20s; search debounce 250ms;
  test model `stepfun/step-3.7-flash:free`; anon key `sk-anonymous`;
  package `com.twitterslv2.island`.

*End of REPORT001. File intentionally duplicates no outside document —
everything above was transcribed from the repo, its history, and its
verified quality record on 2026-10-06.*

