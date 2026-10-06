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

  test('nested replies round-trip parent ids (migration v11)', async () => {
    const store = new Store(new Database(await openDatabase('test-nested')));
    await store.createPost({
      id: 'p9', authorId: 'user', body: 'hello', createdAt: new Date().toISOString(),
      likes: 0, reposts: 0, origin: 'offline', edited: false, aiGenerated: false,
    });
    await store.createReply({
      id: 'r1', postId: 'p9', authorId: 'coral', body: 'hi', replyOrder: 0,
      origin: 'offline', createdAt: new Date().toISOString(),
    });
    await store.createReply({
      id: 'r2', postId: 'p9', authorId: 'user', body: 'hey back', replyOrder: 1,
      parentReplyId: 'r1', origin: 'offline', createdAt: new Date().toISOString(),
    });
    const replies = await store.listReplies('p9');
    expect(replies.length).toBe(2);
    expect(replies.find((r) => r.id === 'r2')?.parentReplyId).toBe('r1');
  });

  test('aliased selects project correctly on all adapters', async () => {    const store = new Store(new Database(await openDatabase('test-alias')));
    await store.upsertPersona({
      id: 'ax', handle: 'ax', displayName: 'Ax', role: 'peer', vibe: 't',
      bio: '', avatarSeed: 'ax', affinity: 0.5, active: true, spawnedWeek: 0,
    });
    const rows = await store.query<{ id: string; displayName: string }>(
      'SELECT id, display_name AS displayName FROM personas WHERE id = ?', ['ax'],
    );
    expect(rows[0]?.displayName).toBe('Ax');
  });

  test('provider templates CRUD with one-active-per-kind', async () => {    const store = new Store(new Database(await openDatabase('test-providers')));
    await store.upsertProvider({ id: 'k1', name: 'Kilo', kind: 'chat' });
    await store.upsertProvider({ id: 'k2', name: 'Kilo 2', kind: 'chat' });
    await store.setActiveProvider('chat', 'k1');
    expect((await store.getActiveProvider('chat'))?.id).toBe('k1');
    await store.setActiveProvider('chat', 'k2');
    expect((await store.getActiveProvider('chat'))?.id).toBe('k2');
    await store.upsertProvider({ id: 'k1', name: 'Kilo renamed', kind: 'chat', selectedModel: 'm1' });
    const list = await store.listProviders();
    expect(list.find((p) => p.id === 'k1')?.name).toBe('Kilo renamed');
    expect(list.find((p) => p.id === 'k1')?.selectedModel).toBe('m1');
    await store.deleteProvider('k2');
    expect((await store.listProviders()).map((p) => p.id)).toEqual(['k1']);
  });

  test('favorites toggle round-trips', async () => {
    const store = new Store(new Database(await openDatabase('test-fav2')));
    expect(await store.toggleFavorite('mimi')).toBe(true);
    expect(await store.isFavorite('mimi')).toBe(true);
    expect(await store.toggleFavorite('mimi')).toBe(false);
    expect(await store.listFavorites()).toEqual([]);
  });

  test('drafts save, restore, and discard', async () => {
    const store = new Store(new Database(await openDatabase('test-drafts')));
    expect(await store.getDraft('compose-main')).toBeNull();
    await store.saveDraft('compose-main', 'hello draft');
    expect((await store.getDraft('compose-main'))?.body).toBe('hello draft');
    await store.saveDraft('compose-main', 'edited');
    expect((await store.getDraft('compose-main'))?.body).toBe('edited');
    await store.deleteDraft('compose-main');
    expect(await store.getDraft('compose-main')).toBeNull();
  });

  test('post views accumulate and notification reads persist', async () => {
    const store = new Store(new Database(await openDatabase('test-views')));
    await store.recordPostView('p1');
    await store.recordPostView('p1');
    await store.recordPostView('p2');
    const counts = await store.getPostViewCounts();
    expect(counts['p1']).toBe(2);
    expect(counts['p2']).toBe(1);
    await store.markNotificationRead('n1');
    expect(await store.listNotificationReads()).toEqual(new Set(['n1']));
  });
});
