-- TwitterSL v2 schema v1 (baseline). SQLite. FS holds image bytes; DB holds paths.
-- Ported from v1 store/schema.sql (SCHEMA_VERSION=4 state).
-- v1 BUGFIX applied: v1 line 43-44 missed a comma after `ai_generated`
-- (fixed by a loose fixer script in v1). v2 bakes the comma in from day 0.
-- Migration discipline: never edit merged SQL below; only append via migration-defs.ts.

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS downloaded_models (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  rec_ram_gb INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,            -- friend|fan|peer|meme|troll|news
  vibe TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_seed TEXT NOT NULL DEFAULT '',
  affinity REAL NOT NULL DEFAULT 0.5,
  active INTEGER NOT NULL DEFAULT 1,
  spawned_week INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,       -- persona id or 'user'
  body TEXT NOT NULL,
  image_path TEXT,
  image_prompt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  likes INTEGER NOT NULL DEFAULT 0,
  reposts INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'glimmer',
  quoted_post_id TEXT,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  edited INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  image_path TEXT,
  reply_order INTEGER NOT NULL DEFAULT 0, -- friend is always 0 on user posts
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  origin TEXT NOT NULL DEFAULT 'glimmer'
);

CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  persona_id TEXT NOT NULL REFERENCES personas(id),
  kind TEXT NOT NULL,            -- like|repost
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, persona_id, kind)
);

CREATE TABLE IF NOT EXISTS dms (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,       -- user:<other> or agent:<a>:<b>
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  image_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  origin TEXT NOT NULL DEFAULT 'glimmer'
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL REFERENCES personas(id),
  fact TEXT NOT NULL,
  embedding_ref TEXT,            -- vector ref only, never raw biometrics
  consented INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  path TEXT NOT NULL,
  owner_id TEXT NOT NULL,        -- persona or user
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spawn_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_week INTEGER NOT NULL DEFAULT 0,
  total_spawned INTEGER NOT NULL DEFAULT 10
);

-- v1-v4 additions (ported; delta in migration-defs.ts)
CREATE TABLE IF NOT EXISTS follows (
  persona_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mutes (
  persona_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'mute',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS blocks (
  persona_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'You',
  handle TEXT NOT NULL DEFAULT '@you',
  bio TEXT NOT NULL DEFAULT '',
  avatar_path TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_memories (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  fact TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dm_reads (
  thread_id TEXT PRIMARY KEY,
  last_read_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies (post_id, reply_order);
CREATE INDEX IF NOT EXISTS idx_dms_thread ON dms (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_persona ON memories (persona_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON world_events (starts_at, ends_at);

CREATE TABLE IF NOT EXISTS download_progress (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  downloaded_bytes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'downloading',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
