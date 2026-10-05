// TwitterSL v2 — store schema catalogue (Sprint 2 ports v1 store/schema.sql
// table-for-table via @capacitor-community/sqlite; additive migrations only).
// Tables (v1 parity): personas, posts, replies, reactions, dms, memories,
// pending_memories, follows, followers, mutes, reports, bookmarks, downloaded_models,
// generated_images, world_events, dm_reads, user_profile, agent_config, spawn_state.

export const SCHEMA_TABLES = [
  'personas',
  'posts',
  'replies',
  'reactions',
  'dms',
  'memories',
  'pending_memories',
  'follows',
  'followers',
  'mutes',
  'reports',
  'bookmarks',
  'downloaded_models',
  'generated_images',
  'world_events',
  'dm_reads',
  'user_profile',
  'agent_config',
  'spawn_state',
] as const;

export interface PersonaRow {
  id: string;
  handle: string;
  displayName: string;
  role: string;
  vibe: string;
  bio: string;
  avatarSeed: string;
  affinity: number;
  active: boolean;
  spawnedWeek: number;
  createdAt: string;
}

export interface PostRow {
  id: string;
  authorId: string;
  body: string;
  imagePath?: string;
  imagePrompt?: string;
  quotedPostId?: string;
  edited: boolean;
  createdAt: string;
  likes: number;
  reposts: number;
  origin: 'glimmer' | 'offline';
  aiGenerated: boolean;
}

export interface ReplyRow {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  imagePath?: string;
  replyOrder: number;
  origin: 'glimmer' | 'offline';
}

export interface ReactionRow {
  id: string;
  postId: string;
  personaId: string;
  kind: 'like' | 'repost';
  createdAt: string;
}

export interface DmRow {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  imagePath?: string;
  createdAt: string;
  origin: 'glimmer' | 'offline';
}

export interface MemoryRow {
  id: string;
  personaId: string;
  fact: string;
  embeddingRef?: string;
  consented: boolean;
  createdAt: string;
}

export interface BookmarkRow {
  id: string;
  postId: string;
  createdAt: string;
}

export interface FollowRow {
  personaId: string;
  createdAt: string;
}

export interface MuteRow {
  personaId: string;
  kind: string;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface UserProfileRow {
  displayName: string;
  handle: string;
  bio: string;
  avatarPath?: string;
}

export interface AgentConfigRow {
  key: string;
  value: string;
}

export interface SpawnStateRow {
  id: number;
  currentWeek: number;
  totalSpawned: number;
}

export interface GeneratedImageRow {
  id: string;
  prompt: string;
  path: string;
  ownerId: string;
  createdAt: string;
}

export interface WorldEventRow {
  id: string;
  title: string;
  detail: string;
  startsAt: string;
  endsAt: string;
}

export interface DmReadRow {
  threadId: string;
  lastReadAt: string;
}

export interface DownloadedModelRow {
  id: string;
  repo: string;
  path: string;
  sizeBytes: number;
  recRamGb: number;
}

// TODO(S2): export Zod row schemas per table once schema.sql is ported.
