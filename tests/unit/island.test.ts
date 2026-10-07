import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { weeklySpawn } from '@/lib/background';
import { PersonaAvatar, accentFor } from '@/components/PersonaAvatar';

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

describe('stories', () => {
  it('creates, lists active, expires, and tracks views', async () => {
    const store = await freshStore('test-stories');
    const now = new Date();
    const future = new Date(now.getTime() + 3600000).toISOString();
    const past = new Date(now.getTime() - 1000).toISOString();
    await store.createStory({ id: 'st-live', authorId: 'mimi', body: 'hello', expiresAt: future });
    await store.createStory({ id: 'st-old', authorId: 'mimi', body: 'bye', expiresAt: past });
    const active = await store.listActiveStories(now.toISOString());
    expect(active.map((s) => s.id)).toEqual(['st-live']);
    expect(await store.listStoryViews('st-live')).toEqual([]);
    await store.markStoryViewed('st-live', 'user');
    await store.markStoryViewed('st-live', 'user');
    expect(await store.listStoryViews('st-live')).toEqual(['user']);
  });
});

describe('PersonaAvatar', () => {
  it('is deterministic per seed and shared by name', () => {
    expect(accentFor('coral')).toBe(accentFor('coral'));
    expect(typeof PersonaAvatar).toBe('function');
  });
});

describe('arrival ceremony', () => {
  it('weekly spawn announces newcomers with a post and a DM', async () => {
    const store = await freshStore('test-arrival');
    await store.run('INSERT INTO spawn_state (id, current_week, total_spawned) VALUES (1, 0, 10)');
    await weeklySpawn(store);
    const state = await store.getSpawnState();
    expect(state?.currentWeek).toBe(1);
    const posts = await store.query<{ author_id: string; body: string }>('SELECT author_id, body FROM posts');
    expect(posts.some((p) => p.body.includes('washed ashore'))).toBe(true);
    const dms = await store.query<{ thread_id: string; sender_id: string }>('SELECT thread_id, sender_id FROM dms');
    expect(dms.some((d) => d.thread_id.startsWith('user:') && d.sender_id !== 'user')).toBe(true);
  });
});
