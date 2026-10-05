// TwitterSL v2 — migration registry (Sprint 2).
// Append-only: each migration adds tables/columns/indexes; never edits merged SQL.
// v1 baseline = full CREATE TABLE set from store/schema.sql.
// v2 = indexes (idempotent IF NOT EXISTS).
// v3/v4 reserved for future additive changes.

import { splitStatements } from '../lib/domain/sql';

export const SCHEMA_VERSION = 12;

export interface Migration {
  version: number;
  name: string;
  sql: string[];
}

const BASELINE = `
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
  role TEXT NOT NULL,
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
  author_id TEXT NOT NULL,
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
  reply_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  origin TEXT NOT NULL DEFAULT 'glimmer'
);
CREATE TABLE IF NOT EXISTS reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  persona_id TEXT NOT NULL REFERENCES personas(id),
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (post_id, persona_id, kind)
);
CREATE TABLE IF NOT EXISTS dms (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
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
  embedding_ref TEXT,
  consented INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  prompt TEXT NOT NULL,
  path TEXT NOT NULL,
  owner_id TEXT NOT NULL,
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
`;

const INDEXES = `
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies (post_id, reply_order);
CREATE INDEX IF NOT EXISTS idx_dms_thread ON dms (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memories_persona ON memories (persona_id);
CREATE INDEX IF NOT EXISTS idx_events_time ON world_events (starts_at, ends_at);
`;

const DOWNLOAD_PROGRESS = `
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
`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'baseline',
    sql: splitStatements(BASELINE),
  },
  {
    version: 2,
    name: 'add-indexes',
    sql: splitStatements(INDEXES),
  },
  {
    version: 3,
    name: 'future-v3',
    sql: [],
  },
  {
    version: 4,
    name: 'future-v4',
    sql: [],
  },
  {
    version: 5,
    name: 'add-download-progress',
    sql: splitStatements(DOWNLOAD_PROGRESS),
  },
  {
    version: 6,
    name: 'add-muted-words',
    sql: splitStatements(`CREATE TABLE IF NOT EXISTS muted_words (word TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')));`),
  },
  {
    version: 7,
    name: 'add-polls',
    sql: splitStatements(`CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, question TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))); CREATE TABLE IF NOT EXISTS poll_options (id TEXT PRIMARY KEY, poll_id TEXT NOT NULL, label TEXT NOT NULL, votes INTEGER NOT NULL DEFAULT 0);`),
  },
  {
    version: 8,
    name: 'add-new-indexes',
    sql: splitStatements(`CREATE INDEX IF NOT EXISTS idx_polls_post ON polls (post_id); CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options (poll_id); CREATE INDEX IF NOT EXISTS idx_muted_words_word ON muted_words (word); CREATE INDEX IF NOT EXISTS idx_generated_images_owner ON generated_images (owner_id);`),
  },
  {
    version: 9,
    name: 'add-poll-votes',
    sql: splitStatements(`CREATE TABLE IF NOT EXISTS poll_votes (poll_id TEXT NOT NULL, persona_id TEXT NOT NULL, option_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (poll_id, persona_id)); CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);`),
  },
  {
    version: 10,
    name: 'add-followers',
    sql: splitStatements(`CREATE TABLE IF NOT EXISTS followers (persona_id TEXT PRIMARY KEY, created_at TEXT NOT NULL DEFAULT (datetime('now')));`),
  },
  {
    version: 11,
    name: 'add-reply-parent',
    sql: splitStatements(`ALTER TABLE replies ADD COLUMN parent_reply_id TEXT;`),
  },
  {
    version: 12,
    name: 'add-post-image-url',
    sql: splitStatements(`ALTER TABLE posts ADD COLUMN image_url TEXT;`),
  },
];
