import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { exportAllData, importBackup } from '@/lib/api/export';
import { storageBreakdown, pruneOrphanedBlobs } from '@/lib/api/storage-man';

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

function fakeFiles(blobs: Map<string, Uint8Array>) {
  return {
    async saveBlob(path: string, bytes: Uint8Array) { blobs.set(path, bytes); },
    async getBlob(path: string) { return blobs.get(path) ?? null; },
    async deleteBlob(path: string) { blobs.delete(path); },
    async listBlobs(prefix?: string) {
      return [...blobs.keys()].filter((k) => !prefix || k.startsWith(prefix));
    },
  };
}

describe('backup import', () => {
  it('merges missing rows and skips existing', async () => {
    const store = await freshStore('test-import');
    await store.upsertPersona({
      id: 'mimi', handle: 'mimi', displayName: 'Mimi', role: 'friend', vibe: 't',
      bio: '', avatarSeed: 'mimi', affinity: 1, active: true, spawnedWeek: 0,
    });
    const first = await importBackup(store, {
      personas: [{ id: 'mimi', handle: 'mimi' }, { id: 'coral', handle: 'coral' }],
      posts: [{ id: 'p1', author_id: 'mimi', body: 'hi', created_at: new Date().toISOString() }],
      dms: [],
      favorites: [{ persona_id: 'coral' }],
    });
    expect(first.added.personas).toBe(1);
    expect(first.skipped.personas).toBe(1);
    expect(first.added.posts).toBe(1);
    expect(first.added.favorites).toBe(1);
    const second = await importBackup(store, {
      personas: [{ id: 'coral', handle: 'coral' }],
      posts: [],
      dms: [],
      favorites: [{ persona_id: 'coral' }],
    });
    expect(second.added.personas ?? 0).toBe(0);
    expect(second.skipped.favorites).toBe(1);
    expect(await exportAllData(store)).toMatchObject({});
  });

  it('replaces older posts with newer backup rows', async () => {
    const store = await freshStore('test-import-newer');
    await store.createPost({
      id: 'p9', authorId: 'user', body: 'old', createdAt: '2020-01-01T00:00:00.000Z',
      likes: 0, reposts: 0, origin: 'offline',
    });
    const res = await importBackup(store, {
      personas: [],
      posts: [{ id: 'p9', author_id: 'user', body: 'new', created_at: '2021-01-01T00:00:00.000Z' }],
      dms: [],
      favorites: [],
    });
    expect(res.added.posts).toBe(1);
    expect((await store.getPost('p9'))?.body).toBe('new');
  });

  it('rejects non-backup input gracefully', async () => {
    const store = await freshStore('test-import-bad');
    const res = await importBackup(store, { personas: [{ noId: true }] });
    expect(res.added.personas ?? 0).toBe(0);
  });
});

describe('storage manager', () => {
  it('inventories blobs and prunes orphans only', async () => {
    const store = await freshStore('test-storage');
    const blobs = new Map<string, Uint8Array>();
    const files = fakeFiles(blobs);
    await files.saveBlob('media/keep.png', new Uint8Array([1]));
    await files.saveBlob('media/drop.png', new Uint8Array([2]));
    await files.saveBlob('avatars/you.png', new Uint8Array([3]));
    await store.createPost({
      id: 'pm', authorId: 'user', body: 'x', createdAt: new Date().toISOString(),
      likes: 0, reposts: 0, origin: 'offline', imagePath: 'media/keep.png',
    });
    const info = await storageBreakdown(files as never, store);
    expect(info.total).toBe(3);
    expect(info.byPrefix['media']).toBe(2);
    expect(info.orphaned.sort()).toEqual(['avatars/you.png', 'media/drop.png']);
    expect(await pruneOrphanedBlobs(files as never, store)).toBe(2);
    expect(await files.listBlobs()).toEqual(['media/keep.png']);
  });
});
