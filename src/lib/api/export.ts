// API: export (Sprint 8). Data export helper.

import type { Store } from './store';

export async function exportAllData(store: Store): Promise<Record<string, unknown>> {
  const posts = await store.query<any>('SELECT * FROM posts ORDER BY created_at DESC');
  const replies = await store.query<any>('SELECT * FROM replies ORDER BY created_at ASC');
  const dms = await store.query<any>('SELECT * FROM dms ORDER BY created_at ASC');
  const profile = await store.getUserProfile();
  const bookmarks = await store.query<any>('SELECT id, post_id AS postId, created_at AS createdAt FROM bookmarks ORDER BY created_at DESC');
  const personas = await store.query<any>('SELECT * FROM personas ORDER BY created_at ASC');
  const mutedWords = await store.query<any>('SELECT word, created_at AS createdAt FROM muted_words ORDER BY created_at ASC');

  return {
    exportedAt: new Date().toISOString(),
    posts,
    replies,
    dms,
    profile,
    bookmarks,
    personas,
    mutedWords,
  };
}
