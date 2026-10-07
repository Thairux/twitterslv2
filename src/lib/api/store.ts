import { z } from 'zod';
import type { Database } from './db';
import type { Post, Reply } from '../domain/post';
import type { Persona as PersonaDomain } from '../domain/persona';
import type { ProviderRow as Provider, ProviderKind } from '@/store/schema';

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
  /** Optional quoted message this DM replies to (v22). */
  replyToId?: string;
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
  imageUrl: z.string().optional(),
  quotedPostId: z.string().optional(),
  edited: z.boolean().optional(),
  createdAt: z.string(),
  likes: z.number(),
  reposts: z.number(),
  origin: z.enum(['glimmer', 'offline']),
  aiGenerated: z.boolean().optional(),
  replyControl: z.enum(['everyone', 'followed', 'mentioned']).optional(),
});

const ReplySchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  body: z.string(),
  imagePath: z.string().optional(),
  replyOrder: z.number(),
  parentReplyId: z.string().optional(),
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
  replyToId: z.string().optional(),
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

  // Favorites (starred personas)
  async listFavorites(): Promise<string[]> {
    const rows = await this.query<{ persona_id: string }>('SELECT persona_id FROM favorites');
    return rows.map((r) => r.persona_id);
  }

  async isFavorite(personaId: string): Promise<boolean> {
    const row = await this.selectOne<{ persona_id: string }>('SELECT persona_id FROM favorites WHERE persona_id = ?', [personaId]);
    return !!row;
  }

  async toggleFavorite(personaId: string): Promise<boolean> {
    if (await this.isFavorite(personaId)) {
      await this.db.run('DELETE FROM favorites WHERE persona_id = ?', [personaId]);
      return false;
    }
    await this.db.run('INSERT OR IGNORE INTO favorites (persona_id, created_at) VALUES (?, ?)', [personaId, new Date().toISOString()]);
    return true;
  }

  // Drafts (composer autosave)
  async saveDraft(id: string, body: string, quoteId?: string): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.selectOne<{ id: string }>('SELECT id FROM drafts WHERE id = ?', [id]);
    if (existing) {
      await this.db.run('UPDATE drafts SET body = ?, quote_id = ?, updated_at = ? WHERE id = ?', [body, quoteId ?? null, now, id]);
    } else {
      await this.db.run('INSERT INTO drafts (id, body, quote_id, updated_at) VALUES (?, ?, ?, ?)', [id, body, quoteId ?? null, now]);
    }
  }

  async getDraft(id: string): Promise<{ id: string; body: string; quoteId?: string } | null> {
    const row = await this.selectOne<any>('SELECT * FROM drafts WHERE id = ?', [id]);
    if (!row) return null;
    return { id: row.id, body: row.body ?? '', quoteId: row.quote_id ?? undefined };
  }

  async deleteDraft(id: string): Promise<void> {
    await this.db.run('DELETE FROM drafts WHERE id = ?', [id]);
  }

  // Post views (one row per open)
  async recordPostView(postId: string, viewerId = 'user'): Promise<void> {
    await this.db.run('INSERT INTO post_views (post_id, viewer_id, viewed_at) VALUES (?, ?, ?)', [postId, viewerId, new Date().toISOString()]);
  }

  async getPostViewCounts(): Promise<Record<string, number>> {
    // No GROUP BY: web fallback counts in JS.
    const rows = await this.query<{ post_id: string }>('SELECT post_id FROM post_views');
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
    return counts;
  }

  /** Per-day views + likes for one post (own-post analytics strip). */
  async getPostDailyStats(postId: string): Promise<{ views: Record<string, number>; likes: Record<string, number> }> {
    const views: Record<string, number> = {};
    const likes: Record<string, number> = {};
    try {
      const vrows = await this.query<{ viewed_at: string }>('SELECT viewed_at FROM post_views WHERE post_id = ?', [postId]);
      for (const r of vrows) {
        const day = (r.viewed_at || '').slice(0, 10);
        if (day) views[day] = (views[day] ?? 0) + 1;
      }
    } catch {
      // ignore
    }
    try {
      const lrows = await this.query<{ created_at: string }>("SELECT created_at FROM reactions WHERE post_id = ? AND kind = 'like'", [postId]);
      for (const r of lrows) {
        const day = (r.created_at || '').slice(0, 10);
        if (day) likes[day] = (likes[day] ?? 0) + 1;
      }
    } catch {
      // ignore
    }
    return { views, likes };
  }

  // Notification read state
  async markNotificationRead(id: string): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO notification_reads (id, read_at) VALUES (?, ?)', [id, new Date().toISOString()]);
  }

  async listNotificationReads(): Promise<Set<string>> {
    const rows = await this.query<{ id: string }>('SELECT id FROM notification_reads');
    return new Set(rows.map((r) => r.id));
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

  /** Active rules for a surface (timeline|notifications|replies); prunes expired. */
  async listActiveMutedWords(surface: string, now = new Date().toISOString()): Promise<string[]> {
    // Web-driver rule: no comparison operators — prune expired in JS.
    try {
      const all = await this.query<{ word: string; expires_at: string | null }>('SELECT word, expires_at FROM muted_word_rules');
      for (const r of all) {
        if (r.expires_at && r.expires_at <= now) {
          await this.db.run('DELETE FROM muted_word_rules WHERE word = ?', [r.word]).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
    const rules = await this.listMutedWordRules().catch(() => []);
    const active = rules.filter((r) => r.surfaces.includes(surface) && (!r.expiresAt || r.expiresAt > now));
    if (active.length > 0) return active.map((r) => r.word);
    // Fall back to the legacy global list until migrated.
    return this.listMutedWords().catch(() => []);
  }
  async report(targetType: string, targetId: string, reason: string): Promise<void> {
    Schemas.Report.parse({ id: `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, targetType, targetId, reason, createdAt: new Date().toISOString() });
    await this.db.run('INSERT INTO reports (id, target_type, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?)', [`r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, targetType, targetId, reason, new Date().toISOString()]);
  }

  // Posts
  async createPost(post: Post): Promise<void> {
    const validated = Schemas.Post.parse(post);
    await this.db.run(
      `INSERT INTO posts (id, author_id, body, image_path, image_prompt, image_url, quoted_post_id, edited, reply_control, created_at, likes, reposts, origin, ai_generated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [validated.id, validated.authorId, validated.body, validated.imagePath ?? null, validated.imagePrompt ?? null, validated.imageUrl ?? null, validated.quotedPostId ?? null, validated.edited ? 1 : 0, validated.replyControl ?? 'everyone', validated.createdAt, validated.likes, validated.reposts, validated.origin, validated.aiGenerated ? 1 : 0],
    );
  }
  mapPostRow(row: any): Post {
    return Schemas.Post.parse({
      id: row.id,
      authorId: row.author_id,
      body: row.body ?? '',
      imagePath: row.image_path ?? undefined,
      imagePrompt: row.image_prompt ?? undefined,
      imageUrl: row.image_url ?? undefined,
      quotedPostId: row.quoted_post_id ?? undefined,
      edited: row.edited === 1,
      replyControl: row.reply_control === 'followed' || row.reply_control === 'mentioned' ? row.reply_control : 'everyone',
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
      `UPDATE posts SET body = ?, edited = ?, image_path = ?, image_prompt = ?, image_url = ?, quoted_post_id = ?, reply_control = ? WHERE id = ?`,
      [validated.body, validated.edited ? 1 : 0, validated.imagePath ?? null, validated.imagePrompt ?? null, validated.imageUrl ?? null, validated.quotedPostId ?? null, validated.replyControl ?? existing.replyControl ?? 'everyone', id],
    );
  }
  async deletePost(id: string): Promise<void> {
    await this.db.run('DELETE FROM posts WHERE id = ?', [id]);
  }

  // Replies
  async createReply(reply: Reply): Promise<void> {
    const validated = Schemas.Reply.parse(reply);
    await this.db.run(
      `INSERT INTO replies (id, post_id, author_id, body, image_path, reply_order, parent_reply_id, origin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [validated.id, validated.postId, validated.authorId, validated.body, validated.imagePath ?? null, validated.replyOrder, validated.parentReplyId ?? null, validated.origin, validated.createdAt],
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
      parentReplyId: row.parent_reply_id ?? undefined,
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

  // Providers — saved model-provider templates (OpenCode-style). Secrets
  // (endpoint URL + API key) live in Preferences, never here (rule 07).
  async listProviders(): Promise<Provider[]> {
    const rows = await this.query<any>('SELECT * FROM providers ORDER BY created_at ASC');
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind === 'image' || r.kind === 'caption' ? r.kind : 'chat',
      selectedModel: r.selected_model ?? undefined,
      active: r.active === 1,
      createdAt: r.created_at,
    }));
  }

  async upsertProvider(p: { id: string; name: string; kind: ProviderKind; selectedModel?: string; active?: boolean }): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.selectOne<{ id: string }>('SELECT id FROM providers WHERE id = ?', [p.id]);
    if (existing) {
      await this.db.run('UPDATE providers SET name = ?, kind = ?, selected_model = ? WHERE id = ?', [p.name, p.kind, p.selectedModel ?? null, p.id]);
      if (p.active !== undefined) {
        await this.db.run('UPDATE providers SET active = ? WHERE id = ?', [p.active ? 1 : 0, p.id]);
      }
    } else {
      await this.db.run('INSERT INTO providers (id, name, kind, selected_model, active, created_at) VALUES (?, ?, ?, ?, ?, ?)', [p.id, p.name, p.kind, p.selectedModel ?? null, p.active ? 1 : 0, now]);
    }
  }

  async deleteProvider(id: string): Promise<void> {
    await this.db.run('DELETE FROM providers WHERE id = ?', [id]);
  }

  /** Exactly one active provider per kind. */
  async setActiveProvider(kind: ProviderKind, id: string | null): Promise<void> {
    await this.db.run('UPDATE providers SET active = 0 WHERE kind = ?', [kind]);
    if (id) {
      await this.db.run('UPDATE providers SET active = 1 WHERE id = ? AND kind = ?', [id, kind]);
    }
  }

  async getActiveProvider(kind: ProviderKind): Promise<Provider | null> {
    const row = await this.selectOne<any>('SELECT * FROM providers WHERE kind = ? AND active = 1', [kind]);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      selectedModel: row.selected_model ?? undefined,
      active: true,
      createdAt: row.created_at,
    };
  }

  // Memories
  async createPendingMemory(m: { id: string; personaId: string; fact: string }): Promise<void> {    Schemas.Memory.parse({ id: m.id, personaId: m.personaId, fact: m.fact, consented: false, createdAt: new Date().toISOString() });
    await this.db.run('INSERT INTO pending_memories (id, persona_id, fact, created_at) VALUES (?, ?, ?, ?)', [m.id, m.personaId, m.fact, new Date().toISOString()]);
  }
  async approveMemory(pendingId: string): Promise<void> {
    const id = `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const now = new Date().toISOString();
    // Web-safe: the fallback driver rejects INSERT...SELECT, so move the
    // row with plain statements inside one transaction instead.
    const pending = await this.selectOne<any>('SELECT persona_id, fact FROM pending_memories WHERE id = ?', [pendingId]);
    if (!pending) return;
    await this.db.transaction(async (tx) => {
      tx.execute('INSERT INTO memories (id, persona_id, fact, embedding_ref, consented, created_at) VALUES (?, ?, ?, NULL, 1, ?)', [id, pending.persona_id, pending.fact, now]);
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
    await this.db.run('INSERT INTO dms (id, thread_id, sender_id, body, image_path, reply_to_id, created_at, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [validated.id, validated.threadId, validated.senderId, validated.body, validated.imagePath ?? null, validated.replyToId ?? null, validated.createdAt, validated.origin]);
  }
  async listDms(threadId: string): Promise<Dm[]> {
    const rows = await this.query<any>('SELECT * FROM dms WHERE thread_id = ? ORDER BY created_at ASC', [threadId]);
    return rows.map((r) => ({
      id: r.id,
      threadId: r.thread_id,
      senderId: r.sender_id,
      body: r.body,
      imagePath: r.image_path ?? undefined,
      replyToId: r.reply_to_id ?? undefined,
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

  // Provider profiles (v19 OpenCode-style overhaul)
  async listProviderProfiles(kind?: string): Promise<Array<{ id: string; name: string; kind: string; endpoint: string; authType: string; authHeader: string; model?: string; optionsJson: string; priority: number; budgetJson: string; createdAt: string }>> {
    const rows = await this.query<any>(
      kind ? 'SELECT * FROM provider_profiles WHERE kind = ? ORDER BY priority ASC' : 'SELECT * FROM provider_profiles ORDER BY priority ASC',
      kind ? [kind] : [],
    );
    return rows.map((r) => ({
      id: r.id, name: r.name, kind: r.kind, endpoint: r.endpoint ?? '', authType: r.auth_type ?? 'bearer',
      authHeader: r.auth_header ?? '', model: r.model ?? undefined, optionsJson: r.options_json ?? '{}',
      priority: r.priority ?? 0, budgetJson: r.budget_json ?? '{}', createdAt: r.created_at,
    }));
  }

  async upsertProviderProfile(p: { id: string; name: string; kind: string; endpoint?: string; authType?: string; authHeader?: string; model?: string; optionsJson?: string; priority?: number; budgetJson?: string }): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.selectOne<{ id: string }>('SELECT id FROM provider_profiles WHERE id = ?', [p.id]);
    if (existing) {
      await this.db.run('UPDATE provider_profiles SET name = ?, kind = ?, endpoint = ?, auth_type = ?, auth_header = ?, model = ?, options_json = ?, priority = ?, budget_json = ? WHERE id = ?',
        [p.name, p.kind, p.endpoint ?? '', p.authType ?? 'bearer', p.authHeader ?? '', p.model ?? null, p.optionsJson ?? '{}', p.priority ?? 0, p.budgetJson ?? '{}', p.id]);
    } else {
      await this.db.run('INSERT INTO provider_profiles (id, name, kind, endpoint, auth_type, auth_header, model, options_json, priority, budget_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.kind, p.endpoint ?? '', p.authType ?? 'bearer', p.authHeader ?? '', p.model ?? null, p.optionsJson ?? '{}', p.priority ?? 0, p.budgetJson ?? '{}', now]);
    }
  }

  async deleteProviderProfile(id: string): Promise<void> {
    await this.db.run('DELETE FROM persona_providers WHERE profile_id = ?', [id]);
    await this.db.run('DELETE FROM provider_models_cache WHERE profile_id = ?', [id]);
    await this.db.run('DELETE FROM provider_profiles WHERE id = ?', [id]);
  }

  async getPersonaProvider(personaId: string): Promise<string | null> {
    const row = await this.selectOne<{ profile_id: string }>('SELECT profile_id FROM persona_providers WHERE persona_id = ?', [personaId]);
    return row?.profile_id ?? null;
  }

  async setPersonaProvider(personaId: string, profileId: string | null): Promise<void> {
    if (!profileId) {
      await this.db.run('DELETE FROM persona_providers WHERE persona_id = ?', [personaId]);
      return;
    }
    await this.db.run('INSERT OR REPLACE INTO persona_providers (persona_id, profile_id, created_at) VALUES (?, ?, ?)', [personaId, profileId, new Date().toISOString()]);
  }

  async getProviderModelsCache(profileId: string): Promise<{ modelsJson: string; fetchedAt: string } | null> {
    const row = await this.selectOne<any>('SELECT models_json, fetched_at FROM provider_models_cache WHERE profile_id = ?', [profileId]);
    return row ? { modelsJson: row.models_json ?? '[]', fetchedAt: row.fetched_at } : null;
  }

  async setProviderModelsCache(profileId: string, modelsJson: string): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO provider_models_cache (profile_id, models_json, fetched_at) VALUES (?, ?, ?)', [profileId, modelsJson, new Date().toISOString()]);
  }

  // Relationships + persona state (v20)
  async listRelationships(): Promise<Array<{ aId: string; bId: string; rel: string; weight: number }>> {
    const rows = await this.query<any>('SELECT a_id, b_id, rel, weight FROM relationships');
    return rows.map((r) => ({ aId: r.a_id, bId: r.b_id, rel: r.rel, weight: r.weight ?? 0.5 }));
  }

  async setRelationship(aId: string, bId: string, rel: string, weight = 0.5): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO relationships (a_id, b_id, rel, weight, updated_at) VALUES (?, ?, ?, ?, ?)', [aId, bId, rel, weight, new Date().toISOString()]);
  }

  async getPersonaState(personaId: string): Promise<Record<string, unknown>> {
    try {
      const row = await this.selectOne<{ state_json: string }>('SELECT state_json FROM persona_state WHERE persona_id = ?', [personaId]);
      if (!row?.state_json) return {};
      return JSON.parse(row.state_json) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  async setPersonaState(personaId: string, state: Record<string, unknown>): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO persona_state (persona_id, state_json, updated_at) VALUES (?, ?, ?)', [personaId, JSON.stringify(state), new Date().toISOString()]);
  }

  // Stories (v21)
  async createStory(s: { id: string; authorId: string; body: string; imagePath?: string; expiresAt: string }): Promise<void> {
    await this.db.run('INSERT INTO stories (id, author_id, body, image_path, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [s.id, s.authorId, s.body, s.imagePath ?? null, new Date().toISOString(), s.expiresAt]);
  }

  async listActiveStories(now = new Date().toISOString()): Promise<Array<{ id: string; authorId: string; body: string; imagePath?: string; createdAt: string; expiresAt: string }>> {
    // Web-driver rule: no comparison operators in WHERE — filter in JS.
    const rows = await this.query<any>('SELECT * FROM stories ORDER BY created_at DESC');
    return rows
      .filter((r) => (r.expires_at ?? '') > now)
      .map((r) => ({ id: r.id, authorId: r.author_id, body: r.body ?? '', imagePath: r.image_path ?? undefined, createdAt: r.created_at, expiresAt: r.expires_at }));
  }

  async markStoryViewed(storyId: string, viewerId: string): Promise<void> {
    // Idempotent by read-check: the web fallback honors OR IGNORE only
    // for single-column PKs, and story_views has a composite PK.
    const existing = await this.selectOne<{ story_id: string }>(
      'SELECT story_id FROM story_views WHERE story_id = ? AND viewer_id = ?',
      [storyId, viewerId],
    ).catch(() => null);
    if (existing) return;
    await this.db.run('INSERT INTO story_views (story_id, viewer_id, viewed_at) VALUES (?, ?, ?)', [storyId, viewerId, new Date().toISOString()]);
  }

  async listStoryViews(storyId: string): Promise<string[]> {
    const rows = await this.query<{ viewer_id: string }>('SELECT viewer_id FROM story_views WHERE story_id = ?', [storyId]);
    return rows.map((r) => r.viewer_id);
  }

  // DM reactions + folders + pins + badges (v22)
  async toggleDmReaction(dmId: string, personaId: string, emoji: string): Promise<boolean> {
    const existing = await this.selectOne<any>('SELECT emoji FROM dm_reactions WHERE dm_id = ? AND persona_id = ?', [dmId, personaId]);
    if (existing) {
      await this.db.run('DELETE FROM dm_reactions WHERE dm_id = ? AND persona_id = ?', [dmId, personaId]);
      return false;
    }
    await this.db.run('INSERT INTO dm_reactions (dm_id, persona_id, emoji, created_at) VALUES (?, ?, ?, ?)', [dmId, personaId, emoji, new Date().toISOString()]);
    return true;
  }

  async listDmReactions(dmIds: string[]): Promise<Array<{ dmId: string; personaId: string; emoji: string }>> {
    if (dmIds.length === 0) return [];
    const placeholders = dmIds.map(() => '?').join(',');
    const rows = await this.query<any>(`SELECT dm_id, persona_id, emoji FROM dm_reactions WHERE dm_id IN (${placeholders})`, dmIds);
    return rows.map((r) => ({ dmId: r.dm_id, personaId: r.persona_id, emoji: r.emoji }));
  }

  async listBookmarkFolders(): Promise<Array<{ id: string; name: string }>> {
    const rows = await this.query<any>('SELECT id, name FROM bookmark_folders ORDER BY created_at ASC');
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async createBookmarkFolder(name: string): Promise<string> {
    const id = `bf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await this.db.run('INSERT INTO bookmark_folders (id, name, created_at) VALUES (?, ?, ?)', [id, name.slice(0, 40), new Date().toISOString()]);
    return id;
  }

  async getBookmarkFolder(bookmarkId: string): Promise<string | null> {
    const row = await this.selectOne<{ folder_id: string }>('SELECT folder_id FROM bookmark_folder_items WHERE bookmark_id = ?', [bookmarkId]);
    return row?.folder_id ?? null;
  }

  async setBookmarkFolder(bookmarkId: string, folderId: string | null): Promise<void> {
    await this.db.run('DELETE FROM bookmark_folder_items WHERE bookmark_id = ?', [bookmarkId]);
    if (folderId) {
      await this.db.run('INSERT OR IGNORE INTO bookmark_folder_items (folder_id, bookmark_id) VALUES (?, ?)', [folderId, bookmarkId]);
    }
  }

  async listPinnedThreads(): Promise<string[]> {
    const rows = await this.query<{ thread_id: string }>('SELECT thread_id FROM pinned_threads');
    return rows.map((r) => r.thread_id);
  }

  async togglePinThread(threadId: string): Promise<boolean> {
    const existing = await this.selectOne<{ thread_id: string }>('SELECT thread_id FROM pinned_threads WHERE thread_id = ?', [threadId]);
    if (existing) {
      await this.db.run('DELETE FROM pinned_threads WHERE thread_id = ?', [threadId]);
      return false;
    }
    await this.db.run('INSERT INTO pinned_threads (thread_id, created_at) VALUES (?, ?)', [threadId, new Date().toISOString()]);
    return true;
  }

  async getPersonaBadge(personaId: string): Promise<string | null> {
    const row = await this.selectOne<{ badge: string }>('SELECT badge FROM persona_badges WHERE persona_id = ?', [personaId]);
    return row?.badge ?? null;
  }

  async setPersonaBadge(personaId: string, badge: string | null): Promise<void> {
    if (!badge) {
      await this.db.run('DELETE FROM persona_badges WHERE persona_id = ?', [personaId]);
      return;
    }
    await this.db.run('INSERT OR REPLACE INTO persona_badges (persona_id, badge, created_at) VALUES (?, ?, ?)', [personaId, badge, new Date().toISOString()]);
  }

  // Muted-word rules with surfaces + expiry (v18; replaces global list)
  async listMutedWordRules(): Promise<Array<{ word: string; surfaces: string[]; expiresAt: string | null }>> {
    const rows = await this.query<any>('SELECT word, surfaces, expires_at FROM muted_word_rules');
    return rows.map((r) => {
      let surfaces: string[] = ['timeline', 'notifications', 'replies'];
      try {
        const parsed: unknown = JSON.parse(r.surfaces ?? '[]');
        if (Array.isArray(parsed)) surfaces = parsed.filter((s): s is string => typeof s === 'string');
      } catch {
        // keep defaults
      }
      return { word: r.word, surfaces, expiresAt: r.expires_at ?? null };
    });
  }

  async upsertMutedWordRule(word: string, surfaces: string[], expiresAt: string | null): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO muted_word_rules (word, surfaces, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [word.toLowerCase(), JSON.stringify(surfaces), expiresAt, new Date().toISOString()]);
  }

  async removeMutedWordRule(word: string): Promise<void> {
    await this.db.run('DELETE FROM muted_word_rules WHERE word = ?', [word.toLowerCase()]);
  }
}
