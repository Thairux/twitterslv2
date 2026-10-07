import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

describe('dm reactions + quote replies', () => {
  it('toggles reactions and persists reply_to_id', async () => {
    const store = await freshStore('test-dmdepth');
    await store.createDm({
      id: 'dm1', threadId: 'user:mimi', senderId: 'mimi', body: 'hey',
      createdAt: new Date().toISOString(), origin: 'offline',
    });
    expect(await store.toggleDmReaction('dm1', 'user', '❤️')).toBe(true);
    expect(await store.toggleDmReaction('dm1', 'user', '❤️')).toBe(false);
    await store.toggleDmReaction('dm1', 'user', '🔥');
    const reacts = await store.listDmReactions(['dm1', 'nope']);
    expect(reacts).toEqual([{ dmId: 'dm1', personaId: 'user', emoji: '🔥' }]);
    await store.createDm({
      id: 'dm2', threadId: 'user:mimi', senderId: 'user', body: 'quoting you',
      replyToId: 'dm1', createdAt: new Date().toISOString(), origin: 'glimmer',
    });
    const thread = await store.listDms('user:mimi');
    expect(thread.find((d) => d.id === 'dm2')?.replyToId).toBe('dm1');
  });
});

describe('bookmark folders', () => {
  it('creates, assigns, and filters', async () => {
    const store = await freshStore('test-folders');
    const fid = await store.createBookmarkFolder('Reading');
    expect((await store.listBookmarkFolders()).map((f) => f.name)).toContain('Reading');
    await store.setBookmarkFolder('b1', fid);
    expect(await store.getBookmarkFolder('b1')).toBe(fid);
    await store.setBookmarkFolder('b1', null);
    expect(await store.getBookmarkFolder('b1')).toBeNull();
  });
});

describe('pinned threads + badges', () => {
  it('pins toggle and badges round-trip', async () => {
    const store = await freshStore('test-pins');
    expect(await store.togglePinThread('user:mimi')).toBe(true);
    expect(await store.listPinnedThreads()).toEqual(['user:mimi']);
    expect(await store.togglePinThread('user:mimi')).toBe(false);
    expect(await store.getPersonaBadge('coral')).toBeNull();
    await store.setPersonaBadge('coral', 'OG');
    expect(await store.getPersonaBadge('coral')).toBe('OG');
    await store.setPersonaBadge('coral', null);
    expect(await store.getPersonaBadge('coral')).toBeNull();
  });
});

describe('reply_control persistence', () => {
  it('defaults to everyone and round-trips', async () => {
    const store = await freshStore('test-audience');
    await store.createPost({
      id: 'pa', authorId: 'user', body: 'hello', createdAt: new Date().toISOString(),
      likes: 0, reposts: 0, origin: 'offline',
    });
    expect((await store.getPost('pa'))?.replyControl).toBe('everyone');
    await store.createPost({
      id: 'pb', authorId: 'user', body: 'inner circle', createdAt: new Date().toISOString(),
      likes: 0, reposts: 0, origin: 'offline', replyControl: 'followed',
    });
    expect((await store.getPost('pb'))?.replyControl).toBe('followed');
  });
});
