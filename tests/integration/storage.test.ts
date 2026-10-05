// Storage adapter contract tests (Sprint 2).
// Every DbAdapter implementation (Capacitor SQLite + web fallback) must pass
// the same suite: open → migrate → CRUD → transaction rollback → close.

import { describe, test, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';

describe('storage adapter contract', () => {
  test('web adapter opens and returns rows', async () => {
    const db = await openDatabase('test-contract');
    const rows = await db.query<{ id: string }>('SELECT id FROM personas');
    expect(Array.isArray(rows)).toBe(true);
  });

  test('reactions recount likes and list authors', async () => {
    const store = new Store(new Database(await openDatabase('test-reactions')));
    for (const id of ['u1', 'u2']) {
      await store.upsertPersona({
        id, handle: id, displayName: id.toUpperCase(), role: 'peer', vibe: 'test',
        bio: '', avatarSeed: id, affinity: 0.5, active: true, spawnedWeek: 0,
      });
    }
    await store.createPost({
      id: 'p1', authorId: 'user', body: 'hello', createdAt: new Date().toISOString(),
      likes: 0, reposts: 0, origin: 'offline', edited: false, aiGenerated: false,
    });
    await store.toggleReaction('p1', 'u1', 'like');
    await store.toggleReaction('p1', 'u2', 'like');
    await store.recountReactions('p1');
    const post = await store.getPost('p1');
    expect(post?.likes).toBe(2);
    const authors = await store.listReactionAuthors('p1', 'like');
    expect(authors.map((a) => a.id).sort()).toEqual(['u1', 'u2']);
  });

  test('followers table exists and round-trips', async () => {
    const store = new Store(new Database(await openDatabase('test-followers')));
    await store.addFollower('coral');
    expect(await store.listFollowers()).toEqual(['coral']);
    await store.removeFollower('coral');
    expect(await store.listFollowers()).toEqual([]);
  });
});
