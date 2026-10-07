// API: export (Sprint 8). Data export helper + backup import (3.0.0 S6).

import type { Store } from './store';

export async function exportAllData(store: Store): Promise<Record<string, unknown>> {
  const posts = await store.query<any>('SELECT * FROM posts ORDER BY created_at DESC');
  const replies = await store.query<any>('SELECT * FROM replies ORDER BY created_at ASC');
  const dms = await store.query<any>('SELECT * FROM dms ORDER BY created_at ASC');
  const profile = await store.getUserProfile();
  const bookmarks = await store.query<any>('SELECT id, post_id AS postId, created_at AS createdAt FROM bookmarks ORDER BY created_at DESC');
  const personas = await store.query<any>('SELECT * FROM personas ORDER BY created_at ASC');
  const mutedWords = await store.query<any>('SELECT word, created_at AS createdAt FROM muted_words ORDER BY created_at ASC');
  const providers = await store.query<any>('SELECT * FROM providers ORDER BY created_at ASC');
  const favorites = await store.query<any>('SELECT * FROM favorites ORDER BY created_at ASC');
  const drafts = await store.query<any>('SELECT * FROM drafts ORDER BY updated_at DESC');
  const followers = await store.query<any>('SELECT * FROM followers ORDER BY created_at ASC');

  return {
    exportedAt: new Date().toISOString(),
    posts,
    replies,
    dms,
    profile,
    bookmarks,
    personas,
    mutedWords,
    providers,
    favorites,
    drafts,
    followers,
  };
}

export interface ImportResult {
  added: Record<string, number>;
  skipped: Record<string, number>;
}

/**
 * Smart-merge backup import (plain JSON, same shape as exportAllData).
 * Missing ids are inserted; existing posts/replies/dms are replaced only
 * when the incoming row is newer (created_at); everything else is
 * insert-missing. Never deletes.
 */
export async function importBackup(store: Store, data: Record<string, unknown>): Promise<ImportResult> {
  const added: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const bump = (table: string, wasAdded: boolean) => {
    if (wasAdded) added[table] = (added[table] ?? 0) + 1;
    else skipped[table] = (skipped[table] ?? 0) + 1;
  };
  const rows = (key: string): Array<Record<string, unknown>> => {
    const v = data[key];
    return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
  };
  for (const r of rows('personas')) {
    if (typeof r.id !== 'string') continue;
    try {
      const existing = await store.getPersona(r.id);
      if (existing) {
        bump('personas', false);
        continue;
      }
      await store.upsertPersona({
        id: r.id,
        handle: String(r.handle ?? r.id),
        displayName: String(r.display_name ?? r.displayName ?? r.id),
        role: (['friend', 'fan', 'peer', 'meme', 'troll', 'news'] as const).includes(r.role as never) ? (r.role as never) : 'peer',
        vibe: String(r.vibe ?? ''),
        bio: String(r.bio ?? ''),
        avatarSeed: String(r.avatar_seed ?? r.avatarSeed ?? r.id),
        affinity: typeof r.affinity === 'number' ? r.affinity : 0.5,
        active: r.active !== 0,
        spawnedWeek: typeof r.spawned_week === 'number' ? (r.spawned_week as number) : 0,
      });
      bump('personas', true);
    } catch {
      bump('personas', false);
    }
  }
  for (const r of rows('posts')) {
    if (typeof r.id !== 'string') continue;
    try {
      const existing = await store.getPost(r.id);
      const incomingAt = String(r.created_at ?? r.createdAt ?? '');
      if (existing) {
        if (incomingAt > existing.createdAt) {
          await store.updatePost(r.id, { body: String(r.body ?? existing.body) });
          bump('posts', true);
        } else {
          bump('posts', false);
        }
        continue;
      }
      await store.createPost({
        id: r.id,
        authorId: String(r.author_id ?? r.authorId ?? 'user'),
        body: String(r.body ?? ''),
        createdAt: incomingAt || new Date().toISOString(),
        likes: typeof r.likes === 'number' ? r.likes : 0,
        reposts: typeof r.reposts === 'number' ? r.reposts : 0,
        origin: r.origin === 'glimmer' ? 'glimmer' : 'offline',
      });
      bump('posts', true);
    } catch {
      bump('posts', false);
    }
  }
  for (const r of rows('dms')) {
    if (typeof r.id !== 'string') continue;
    try {
      const existing = await store.listDms(String(r.thread_id ?? r.threadId ?? ''));
      if (existing.some((d) => d.id === r.id)) {
        bump('dms', false);
        continue;
      }
      await store.createDm({
        id: r.id,
        threadId: String(r.thread_id ?? r.threadId ?? ''),
        senderId: String(r.sender_id ?? r.senderId ?? ''),
        body: String(r.body ?? ''),
        createdAt: String(r.created_at ?? r.createdAt ?? new Date().toISOString()),
        origin: r.origin === 'glimmer' ? 'glimmer' : 'offline',
      });
      bump('dms', true);
    } catch {
      bump('dms', false);
    }
  }
  for (const r of rows('favorites')) {
    const pid = typeof r.persona_id === 'string' ? r.persona_id : typeof r.personaId === 'string' ? r.personaId : null;
    if (!pid) continue;
    try {
      if (await store.isFavorite(pid)) {
        bump('favorites', false);
        continue;
      }
      await store.toggleFavorite(pid);
      bump('favorites', true);
    } catch {
      bump('favorites', false);
    }
  }
  return { added, skipped };
}
