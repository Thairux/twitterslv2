import { z } from 'zod';
import type { Database } from './db';
import type { Post, Reply } from '../domain/post';
import type { Persona as PersonaDomain } from '../domain/persona';

// --- Local interfaces for entities not yet promoted to domain ---

export interface Reaction {
  id: string;
  postId: string;
  personaId: string;
  kind: 'like' | 'repost';
  createdAt: string;
}

export interface Dm {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  imagePath?: string;
  createdAt: string;
  origin: 'glimmer' | 'offline';
}

export interface Bookmark {
  id: string;
  postId: string;
  createdAt: string;
}

export interface Follow {
  personaId: string;
  createdAt: string;
}

export interface Mute {
  personaId: string;
  kind: string;
  createdAt: string;
}

export interface Block {
  personaId: string;
  createdAt: string;
}

export interface MutedWord {
  word: string;
  createdAt: string;
}

export interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface Memory {
  id: string;
  personaId: string;
  fact: string;
  embeddingRef?: string;
  consented: boolean;
  createdAt: string;
}

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
  avatarPath?: string;
}

export interface AgentConfig {
  key: string;
  value: string;
}

export interface SpawnState {
  id: number;
  currentWeek: number;
  totalSpawned: number;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  path: string;
  ownerId: string;
  createdAt: string;
}

export interface WorldEvent {
  id: string;
  title: string;
  detail: string;
  startsAt: string;
  endsAt: string;
}

export interface DmRead {
  threadId: string;
  lastReadAt: string;
}

export interface DownloadedModel {
  id: string;
  repo: string;
  path: string;
  sizeBytes: number;
  recRamGb: number;
}

export interface DownloadProgress {
  id: string;
  repo: string;
  filename: string;
  path: string;
  sizeBytes: number;
  downloadedBytes: number;
  status: string;
}

export interface Poll {
  id: string;
  postId: string;
  question: string;
  options: Array<{ id: string; label: string; votes: number }>;
}

export interface PollOption {
  id: string;
  pollId: string;
  label: string;
  votes: number;
}

// --- Zod schemas (validation only; domain types remain canonical) ---

const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  body: z.string().max(280),
  imagePath: z.string().optional(),
  imagePrompt: z.string().optional(),
  quotedPostId: z.string().optional(),
  edited: z.boolean().optional(),
  createdAt: z.string(),
  likes: z.number(),
  reposts: z.number(),
  origin: z.enum(['glimmer', 'offline']),
  aiGenerated: z.boolean().optional(),
});

const ReplySchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  body: z.string(),
  imagePath: z.string().optional(),
  replyOrder: z.number(),
  origin: z.enum(['glimmer', 'offline']),
  createdAt: z.string(),
});

const ReactionSchema = z.object({
  id: z.string(),
  postId: z.string(),
  personaId: z.string(),
  kind: z.enum(['like', 'repost']),
  createdAt: z.string(),
});

const PersonaSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  role: z.enum(['friend', 'fan', 'peer', 'meme', 'troll', 'news']),
  vibe: z.string(),
  bio: z.string(),
  avatarSeed: z.string(),
  affinity: z.number(),
  active: z.boolean(),
  spawnedWeek: z.number(),
});

const DmSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  senderId: z.string(),
  body: z.string(),
  imagePath: z.string().optional(),
  createdAt: z.string(),
  origin: z.enum(['glimmer', 'offline']),
});

const BookmarkSchema = z.object({
  id: z.string(),
  postId: z.string(),
  createdAt: z.string(),
});

const FollowSchema = z.object({
  personaId: z.string(),
  createdAt: z.string(),
});

const MuteSchema = z.object({
  personaId: z.string(),
  kind: z.string(),
  createdAt: z.string(),
});

const BlockSchema = z.object({
  personaId: z.string(),
  createdAt: z.string(),
});

const MutedWordSchema = z.object({
  word: z.string(),
  createdAt: z.string(),
});

const ReportSchema = z.object({
  id: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  createdAt: z.string(),
});

const MemorySchema = z.object({
  id: z.string(),
  personaId: z.string(),
  fact: z.string(),
  embeddingRef: z.string().optional(),
  consented: z.boolean(),
  createdAt: z.string(),
});

const UserProfileSchema = z.object({
  displayName: z.string(),
  handle: z.string(),
  bio: z.string(),
  avatarPath: z.string().optional(),
});

const AgentConfigSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const SpawnStateSchema = z.object({
  id: z.number(),
  currentWeek: z.number(),
  totalSpawned: z.number(),
});

const GeneratedImageSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  path: z.string(),
  ownerId: z.string(),
  createdAt: z.string(),
});

const WorldEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
});

const DmReadSchema = z.object({
  threadId: z.string(),
  lastReadAt: z.string(),
});

const DownloadedModelSchema = z.object({
  id: z.string(),
  repo: z.string(),
  path: z.string(),
  sizeBytes: z.number(),
  recRamGb: z.number(),
});

const DownloadProgressSchema = z.object({
  id: z.string(),
  repo: z.string(),
  filename: z.string(),
  path: z.string(),
  sizeBytes: z.number(),
  downloadedBytes: z.number(),
  status: z.string(),
});

const PollSchema = z.object({
  id: z.string(),
  postId: z.string(),
  question: z.string(),
});

const PollOptionSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  label: z.string(),
  votes: z.number(),
});

export const Schemas = {
  Post: PostSchema,
  Reply: ReplySchema,
  Reaction: ReactionSchema,
  Persona: PersonaSchema,
  Dm: DmSchema,
  Bookmark: BookmarkSchema,
  Follow: FollowSchema,
  Mute: MuteSchema,
  Block: BlockSchema,
  MutedWord: MutedWordSchema,
  Report: ReportSchema,
  Memory: MemorySchema,
  UserProfile: UserProfileSchema,
  AgentConfig: AgentConfigSchema,
  SpawnState: SpawnStateSchema,
  GeneratedImage: GeneratedImageSchema,
  WorldEvent: WorldEventSchema,
  DmRead: DmReadSchema,
  DownloadedModel: DownloadedModelSchema,
  DownloadProgress: DownloadProgressSchema,
  Poll: PollSchema,
  PollOption: PollOptionSchema,
};

// --- Store ---

export class Store {
  constructor(private db: Database) {}

  // helpers
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.all<T>(sql, params);
  }
  async selectOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return this.db.selectOne<T>(sql, params);
  }
  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.db.run(sql, params);
  }

  // Personas
  mapPersonaRow(row: any): PersonaDomain {
    return {
      id: row.id,
      handle: row.handle,
      displayName: row.display_name,
      role: row.role,
      vibe: row.vibe,
      bio: row.bio,
      avatarSeed: row.avatar_seed,
      affinity: row.affinity,
      active: row.active === 1,
      spawnedWeek: row.spawned_week,
    };
  }
  async listPersonas(): Promise<PersonaDomain[]> {
    const rows = await this.query<any>('SELECT * FROM personas');
    return rows.map((r) => this.mapPersonaRow(r));
  }
  async getPersona(id: string): Promise<PersonaDomain | null> {
    const row = await this.selectOne<any>('SELECT * FROM personas WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapPersonaRow(row);
  }
  async upsertPersona(p: PersonaDomain): Promise<void> {
    await this.db.run(
      `INSERT INTO personas (id, handle, display_name, role, vibe, bio, avatar_seed, affinity, active, spawned_week) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET handle=excluded.handle, display_name=excluded.display_name, role=excluded.role, vibe=excluded.vibe, bio=excluded.bio, avatar_seed=excluded.avatar_seed, affinity=excluded.affinity, active=excluded.active, spawned_week=excluded.spawned_week`,
      [p.id, p.handle, p.displayName, p.role, p.vibe, p.bio, p.avatarSeed, p.affinity, p.active ? 1 : 0, p.spawnedWeek],
    );
  }
  async isFollowing(personaId: string): Promise<boolean> {
    const row = await this.selectOne<{ persona_id: string }>('SELECT persona_id FROM follows WHERE persona_id = ?', [personaId]);
    return !!row;
  }
  async follow(personaId: string): Promise<void> {
    Schemas.Follow.parse({ personaId, createdAt: new Date().toISOString() });
    await this.db.run('INSERT OR IGNORE INTO follows (persona_id, created_at) VALUES (?, ?)', [personaId, new Date().toISOString()]);
  }
  async unfollow(personaId: string): Promise<void> {
    await this.db.run('DELETE FROM follows WHERE persona_id = ?', [personaId]);
  }
  async listFollowing(): Promise<string[]> {
    const rows = await this.query<{ persona_id: string }>('SELECT persona_id FROM follows');
    return rows.map((r) => r.persona_id);
  }
  /** Personas following the user (the island follows you back). */
  async listFollowers(): Promise<string[]> {
    const rows = await this.query<{ persona_id: string }>('SELECT persona_id FROM followers');
    return rows.map((r) => r.persona_id);
  }
  async addFollower(personaId: string): Promise<void> {
    await this.db.run('INSERT OR IGNORE INTO followers (persona_id, created_at) VALUES (?, ?)', [personaId, new Date().toISOString()]);
  }
  async removeFollower(personaId: string): Promise<void> {
    await this.db.run('DELETE FROM followers WHERE persona_id = ?', [personaId]);
  }
  async isMuted(personaId: string): Promise<boolean> {
    const row = await this.selectOne<{ persona_id: string }>('SELECT persona_id FROM mutes WHERE persona_id = ?', [personaId]);
    return !!row;
  }
  async isBlocked(personaId: string): Promise<boolean> {
    const row = await this.selectOne<{ persona_id: string }>('SELECT persona_id FROM blocks WHERE persona_id = ?', [personaId]);
    return !!row;
  }
  async mute(personaId: string): Promise<void> {
    Schemas.Mute.parse({ personaId, kind: 'full', createdAt: new Date().toISOString() });
    await this.db.run('INSERT OR IGNORE INTO mutes (persona_id, kind, created_at) VALUES (?, ?, ?)', [personaId, 'full', new Date().toISOString()]);
  }
  async unmute(personaId: string): Promise<void> {
    await this.db.run('DELETE FROM mutes WHERE persona_id = ?', [personaId]);
  }
  async listMutes(): Promise<string[]> {
    const rows = await this.query<{ persona_id: string }>('SELECT persona_id FROM mutes');
    return rows.map((r) => r.persona_id);
  }
  async block(personaId: string): Promise<void> {
    Schemas.Block.parse({ personaId, createdAt: new Date().toISOString() });
    await this.db.run('INSERT OR IGNORE INTO blocks (persona_id, created_at) VALUES (?, ?)', [personaId, new Date().toISOString()]);
  }
  async unblock(personaId: string): Promise<void> {
    await this.db.run('DELETE FROM blocks WHERE persona_id = ?', [personaId]);
  }
  async listBlocks(): Promise<string[]> {
    const rows = await this.query<{ persona_id: string }>('SELECT persona_id FROM blocks');
    return rows.map((r) => r.persona_id);
  }
  async addMutedWord(word: string): Promise<void> {
    Schemas.MutedWord.parse({ word: word.toLowerCase(), createdAt: new Date().toISOString() });
    await this.db.run('INSERT OR IGNORE INTO muted_words (word, created_at) VALUES (?, ?)', [word.toLowerCase(), new Date().toISOString()]);
  }
  async removeMutedWord(word: string): Promise<void> {
    await this.db.run('DELETE FROM muted_words WHERE word = ?', [word.toLowerCase()]);
  }
  async listMutedWords(): Promise<string[]> {
    const rows = await this.query<{ word: string }>('SELECT word FROM muted_words');
    return rows.map((r) => r.word);
  }
  async report(targetType: string, targetId: string, reason: string): Promise<void> {
    Schemas.Report.parse({ id: `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, targetType, targetId, reason, createdAt: new Date().toISOString() });
    await this.db.run('INSERT INTO reports (id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?)', [`r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, targetType, targetId, reason, new Date().toISOString()]);
  }

  // Posts
  async createPost(post: Post): Promise<void> {
    const validated = Schemas.Post.parse(post);
    await this.db.run(
      `INSERT INTO posts (id, author_id, body, image_path, image_prompt, quoted_post_id, edited, created_at, likes, reposts, origin, ai_generated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [validated.id, validated.authorId, validated.body, validated.imagePath ?? null, validated.imagePrompt ?? null, validated.quotedPostId ?? null, validated.edited ? 1 : 0, validated.createdAt, validated.likes, validated.reposts, validated.origin, validated.aiGenerated ? 1 : 0],
    );
  }
  mapPostRow(row: any): Post {
    return Schemas.Post.parse({
      id: row.id,
      authorId: row.author_id,
      body: row.body ?? '',
      imagePath: row.image_path ?? undefined,
      imagePrompt: row.image_prompt ?? undefined,
      quotedPostId: row.quoted_post_id ?? undefined,
      edited: row.edited === 1,
      createdAt: row.created_at,
      likes: row.likes ?? 0,
      reposts: row.reposts ?? 0,
      origin: row.origin,
      aiGenerated: row.ai_generated === 1,
    });
  }
  async getPost(id: string): Promise<Post | null> {
    const row = await this.selectOne<any>('SELECT * FROM posts WHERE id = ?', [id]);
    if (!row) return null;
    return this.mapPostRow(row);
  }
  async listPosts(authorId?: string): Promise<Post[]> {
    if (authorId) {
      const rows = await this.query<any>('SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC', [authorId]);
      return rows.map((r) => this.mapPostRow(r));
    }
    const rows = await this.query<any>('SELECT * FROM posts ORDER BY created_at DESC');
    return rows.map((r) => this.mapPostRow(r));
  }
  async updatePost(id: string, patch: Partial<Post>): Promise<void> {
    const existing = await this.getPost(id);
    if (!existing) return;
    const next = { ...existing, ...patch };
    const validated = Schemas.Post.parse(next);
    await this.db.run(
      `UPDATE posts SET body = ?, edited = ?, image_path = ?, image_prompt = ?, quoted_post_id = ? WHERE id = ?`,
      [validated.body, validated.edited ? 1 : 0, validated.imagePath ?? null, validated.imagePrompt ?? null, validated.quotedPostId ?? null, id],
    );
  }
  async deletePost(id: string): Promise<void> {
    await this.db.run('DELETE FROM posts WHERE id = ?', [id]);
  }

  // Replies
  async createReply(reply: Reply): Promise<void> {
    const validated = Schemas.Reply.parse(reply);
    await this.db.run(
      `INSERT INTO replies (id, post_id, author_id, body, image_path, reply_order, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [validated.id, validated.postId, validated.authorId, validated.body, validated.imagePath ?? null, validated.replyOrder, validated.origin, validated.createdAt],
    );
  }
  mapReplyRow(row: any): Reply {
    return Schemas.Reply.parse({
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      body: row.body ?? '',
      imagePath: row.image_path ?? undefined,
      replyOrder: row.reply_order ?? 0,
      origin: row.origin,
      createdAt: row.created_at,
    });
  }
  async listReplies(postId?: string): Promise<Reply[]> {
    if (postId) {
      const rows = await this.query<any>('SELECT * FROM replies WHERE post_id = ? ORDER BY reply_order ASC', [postId]);
      return rows.map((r) => this.mapReplyRow(r));
    }
    const rows = await this.query<any>('SELECT * FROM replies ORDER BY created_at ASC');
    return rows.map((r) => this.mapReplyRow(r));
  }

  // Reactions
  async toggleReaction(postId: string, personaId: string, kind: 'like' | 'repost'): Promise<void> {
    const existing = await this.selectOne<{ id: string }>('SELECT id FROM reactions WHERE post_id = ? AND persona_id = ? AND kind = ?', [postId, personaId, kind]);
    if (existing) {
      await this.db.run('DELETE FROM reactions WHERE id = ?', [existing.id]);
    } else {
      const id = `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      await this.db.run('INSERT INTO reactions (id, post_id, persona_id, kind, created_at) VALUES (?, ?, ?, ?, ?)', [id, postId, personaId, kind, new Date().toISOString()]);
    }
  }

  async isReacted(postId: string, personaId: string, kind: 'like' | 'repost'): Promise<boolean> {
    const row = await this.selectOne<{ id: string }>('SELECT id FROM reactions WHERE post_id = ? AND persona_id = ? AND kind = ?', [postId, personaId, kind]);
    return !!row;
  }

  async listReactionAuthors(postId: string, kind: 'like' | 'repost'): Promise<Array<{ id: string; displayName: string; handle: string }>> {
    // No JOIN: the web fallback engine only supports single-table SELECT.
    const reacted = await this.query<{ persona_id: string }>(
      'SELECT persona_id FROM reactions WHERE post_id = ? AND kind = ? ORDER BY created_at ASC',
      [postId, kind],
    );
    const ids = reacted.map((r) => r.persona_id);
    if (ids.length === 0) return [];
    const personas = await this.listPersonas();
    const byId = new Map(personas.map((p) => [p.id, p]));
    const out: Array<{ id: string; displayName: string; handle: string }> = [];
    for (const id of ids) {
      const p = byId.get(id);
      if (id === 'user') out.push({ id: 'user', displayName: 'You', handle: 'you' });
      else if (p) out.push({ id: p.id, displayName: p.displayName, handle: p.handle });
    }
    return out;
  }

  /** Recompute posts.likes/reposts from the reactions table (single source of truth). */
  async recountReactions(postId: string): Promise<void> {
    // No GROUP BY: the web fallback engine only supports plain SELECT.
    const rows = await this.query<{ kind: string }>('SELECT kind FROM reactions WHERE post_id = ?', [postId]);
    let likes = 0;
    let reposts = 0;
    for (const r of rows) {
      if (r.kind === 'like') likes += 1;
      if (r.kind === 'repost') reposts += 1;
    }
    await this.db.run('UPDATE posts SET likes = ?, reposts = ? WHERE id = ?', [likes, reposts, postId]);
  }

  // Bookmarks
  async listBookmarks(_userId: string): Promise<Bookmark[]> {
    return this.query<Bookmark>('SELECT id, post_id AS postId, created_at AS createdAt FROM bookmarks ORDER BY created_at DESC');
  }
  async bookmark(postId: string): Promise<void> {
    Schemas.Bookmark.parse({ id: `b-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, postId, createdAt: new Date().toISOString() });
    await this.db.run('INSERT OR IGNORE INTO bookmarks (id, post_id, created_at) VALUES (?, ?, ?)', [`b-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, postId, new Date().toISOString()]);
  }
  async unbookmark(postId: string): Promise<void> {
    await this.db.run('DELETE FROM bookmarks WHERE post_id = ?', [postId]);
  }

  // Memories
  async createPendingMemory(m: { id: string; personaId: string; fact: string }): Promise<void> {
    Schemas.Memory.parse({ id: m.id, personaId: m.personaId, fact: m.fact, consented: false, createdAt: new Date().toISOString() });
    await this.db.run('INSERT INTO pending_memories (id, persona_id, fact, created_at) VALUES (?, ?, ?, ?)', [m.id, m.personaId, m.fact, new Date().toISOString()]);
  }
  async approveMemory(pendingId: string): Promise<void> {
    const id = `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const now = new Date().toISOString();
    await this.db.transaction(async (tx) => {
      tx.execute('INSERT INTO memories (id, persona_id, fact, embedding_ref, consented, created_at) SELECT ?, persona_id, fact, NULL, 1, ? FROM pending_memories WHERE id = ?', [id, now, pendingId]);
      tx.execute('DELETE FROM pending_memories WHERE id = ?', [pendingId]);
    });
  }
  async listMemories(personaId: string): Promise<Memory[]> {
    const rows = await this.query<any>('SELECT * FROM memories WHERE persona_id = ?', [personaId]);
    return rows.map((r) => ({
      id: r.id,
      personaId: r.persona_id,
      fact: r.fact,
      embeddingRef: r.embedding_ref ?? undefined,
      consented: r.consented === 1,
      createdAt: r.created_at,
    }));
  }

  // User profile / config
  async getUserProfile(): Promise<UserProfile> {
    const row = await this.selectOne<any>('SELECT display_name, handle, bio, avatar_path FROM user_profile WHERE id = 1');
    if (!row) return { displayName: 'You', handle: '@you', bio: '' };
    return {
      displayName: row.display_name,
      handle: row.handle,
      bio: row.bio,
      avatarPath: row.avatar_path ?? undefined,
    };
  }
  async updateUserProfile(p: UserProfile): Promise<void> {
    const validated = Schemas.UserProfile.parse(p);
    const existing = await this.selectOne<{ displayName: string }>('SELECT display_name FROM user_profile WHERE id = 1');
    if (existing) {
      await this.db.run('UPDATE user_profile SET display_name = ?, handle = ?, bio = ?, avatar_path = ? WHERE id = 1', [validated.displayName, validated.handle, validated.bio, validated.avatarPath ?? null]);
    } else {
      await this.db.run('INSERT INTO user_profile (id, display_name, handle, bio, avatar_path) VALUES (1, ?, ?, ?, ?)', [validated.displayName, validated.handle, validated.bio, validated.avatarPath ?? null]);
    }
  }
  async getAgentConfig(key: string): Promise<AgentConfig | null> {
    const row = await this.selectOne<AgentConfig>('SELECT key, value FROM agent_config WHERE key = ?', [key]);
    return row ?? null;
  }
  async setAgentConfig(key: string, value: string): Promise<void> {
    const existing = await this.selectOne<{ key: string }>('SELECT key FROM agent_config WHERE key = ?', [key]);
    if (existing) {
      await this.db.run('UPDATE agent_config SET value = ? WHERE key = ?', [value, key]);
    } else {
      await this.db.run('INSERT INTO agent_config (key, value) VALUES (?, ?)', [key, value]);
    }
  }
  async getSpawnState(): Promise<SpawnState | null> {
    const row = await this.selectOne<any>('SELECT id, current_week, total_spawned FROM spawn_state WHERE id = 1');
    if (!row) return null;
    return {
      id: row.id,
      currentWeek: row.current_week,
      totalSpawned: row.total_spawned,
    };
  }
  async advanceWeek(nextWeek: number): Promise<void> {
    await this.db.run('UPDATE spawn_state SET current_week = ?, total_spawned = total_spawned + 1 WHERE id = 1', [nextWeek]);
  }

  // Generated images
  async createGeneratedImage(img: GeneratedImage): Promise<void> {
    const validated = Schemas.GeneratedImage.parse(img);
    await this.db.run('INSERT INTO generated_images (id, prompt, path, owner_id, created_at) VALUES (?, ?, ?, ?, ?)', [validated.id, validated.prompt, validated.path, validated.ownerId, validated.createdAt]);
  }

  // Downloaded models
  async createDownloadedModel(model: DownloadedModel): Promise<void> {
    const validated = Schemas.DownloadedModel.parse(model);
    await this.db.run('INSERT OR REPLACE INTO downloaded_models (id, repo, path, size_bytes, rec_ram_gb) VALUES (?, ?, ?, ?, ?)', [validated.id, validated.repo, validated.path, validated.sizeBytes, validated.recRamGb]);
  }

  async deleteDownloadedModel(id: string): Promise<void> {
    await this.db.run('DELETE FROM downloaded_models WHERE id = ?', [id]);
  }

  // Download progress
  async upsertDownloadProgress(progress: { id: string; repo: string; filename: string; path: string; sizeBytes: number; downloadedBytes: number; status: string }): Promise<void> {
    const validated = Schemas.DownloadProgress.parse(progress);
    await this.db.run(
      `INSERT OR REPLACE INTO download_progress (id, repo, filename, path, size_bytes, downloaded_bytes, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [validated.id, validated.repo, validated.filename, validated.path, validated.sizeBytes, validated.downloadedBytes, validated.status, new Date().toISOString()]
    );
  }

  async getDownloadProgress(id: string): Promise<{ id: string; repo: string; filename: string; path: string; sizeBytes: number; downloadedBytes: number; status: string } | null> {
    const row = await this.selectOne<{ id: string; repo: string; filename: string; path: string; size_bytes: number; downloaded_bytes: number; status: string }>(
      'SELECT id, repo, filename, path, size_bytes, downloaded_bytes, status FROM download_progress WHERE id = ?',
      [id]
    );
    return row
      ? {
          id: row.id,
          repo: row.repo,
          filename: row.filename,
          path: row.path,
          sizeBytes: row.size_bytes,
          downloadedBytes: row.downloaded_bytes,
          status: row.status,
        }
      : null;
  }

  async deleteDownloadProgress(id: string): Promise<void> {
    await this.db.run('DELETE FROM download_progress WHERE id = ?', [id]);
  }

  // Polls
  async createPoll(poll: { id: string; postId: string; question: string }, options: Array<{ id: string; label: string }>): Promise<void> {
    const validatedPoll = Schemas.Poll.parse(poll);
    const validatedOptions = options.map((o) => Schemas.PollOption.parse({ ...o, pollId: validatedPoll.id, votes: 0 }));
    await this.db.transaction(async (tx) => {
      await tx.execute('INSERT INTO polls (id, post_id, question) VALUES (?, ?, ?)', [validatedPoll.id, validatedPoll.postId, validatedPoll.question]);
      for (const opt of validatedOptions) {
        await tx.execute('INSERT INTO poll_options (id, poll_id, label, votes) VALUES (?, ?, ?, 0)', [opt.id, opt.pollId, opt.label]);
      }
    });
  }
  async getPoll(postId: string): Promise<Poll | null> {
    const pollRow = await this.selectOne<{ id: string; postId: string; question: string }>('SELECT id, post_id AS postId, question FROM polls WHERE post_id = ?', [postId]);
    if (!pollRow) return null;
    const opts = await this.query<PollOption>('SELECT id, poll_id AS pollId, label, votes FROM poll_options WHERE poll_id = ?', [pollRow.id]);
    return {
      id: pollRow.id,
      postId: pollRow.postId,
      question: pollRow.question,
      options: opts.map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
    };
  }
  async votePoll(optionId: string): Promise<void> {
    const pollId = await this.selectOne<{ poll_id: string }>('SELECT poll_id FROM poll_options WHERE id = ?', [optionId]);
    if (!pollId) return;
    try {
      await this.db.run('INSERT INTO poll_votes (poll_id, persona_id, option_id) VALUES (?, ?, ?)', [pollId.poll_id, 'user', optionId]);
      await this.db.run('UPDATE poll_options SET votes = votes + 1 WHERE id = ?', [optionId]);
    } catch {
      // Already voted or poll missing; unique constraint prevents double-counting.
    }
  }
  async hasVoted(pollId: string, personaId = 'user'): Promise<boolean> {
    const row = await this.selectOne<{ poll_id: string }>('SELECT poll_id FROM poll_votes WHERE poll_id = ? AND persona_id = ?', [pollId, personaId]);
    return !!row;
  }

  // DMs
  async createDm(dm: Dm): Promise<void> {
    const validated = Schemas.Dm.parse(dm);
    await this.db.run('INSERT INTO dms (id, thread_id, sender_id, body, image_path, created_at, origin) VALUES (?, ?, ?, ?, ?, ?, ?)', [validated.id, validated.threadId, validated.senderId, validated.body, validated.imagePath ?? null, validated.createdAt, validated.origin]);
  }
  async listDms(threadId: string): Promise<Dm[]> {
    const rows = await this.query<any>('SELECT * FROM dms WHERE thread_id = ? ORDER BY created_at ASC', [threadId]);
    return rows.map((r) => ({
      id: r.id,
      threadId: r.thread_id,
      senderId: r.sender_id,
      body: r.body,
      imagePath: r.image_path ?? undefined,
      createdAt: r.created_at,
      origin: r.origin,
    }));
  }
  async markDmRead(threadId: string): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO dm_reads (thread_id, last_read_at) VALUES (?, ?)', [threadId, new Date().toISOString()]);
  }

  // World events
  async createWorldEvent(ev: WorldEvent): Promise<void> {
    const validated = Schemas.WorldEvent.parse(ev);
    await this.db.run('INSERT INTO world_events (id, title, detail, starts_at, ends_at) VALUES (?, ?, ?, ?, ?)', [validated.id, validated.title, validated.detail, validated.startsAt, validated.endsAt]);
  }
  async listWorldEvents(): Promise<WorldEvent[]> {
    const rows = await this.query<any>('SELECT * FROM world_events ORDER BY starts_at ASC');
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      detail: r.detail,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
    }));
  }
  async getActiveWorldEvent(now: string): Promise<WorldEvent | null> {
    const row = await this.selectOne<any>('SELECT * FROM world_events WHERE starts_at <= ? AND ends_at >= ? ORDER BY starts_at DESC LIMIT 1', [now, now]);
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      detail: row.detail,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    };
  }
}
