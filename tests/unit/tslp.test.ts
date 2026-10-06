import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { SocialStore } from '@/lib/api/social-store';
import { personaStats, todayStats } from '@/lib/api/stats';
import { generatePersona } from '@/lib/api/persona-generator';

async function seeded(): Promise<Store> {
  const store = new Store(new Database(await openDatabase('test-tslp-stats')));
  for (const id of ['mimi', 'coral']) {
    await store.upsertPersona({
      id, handle: id, displayName: id.toUpperCase(), role: 'peer', vibe: 't',
      bio: '', avatarSeed: id, affinity: 0.5, active: true, spawnedWeek: 0,
    });
  }
  await store.createPost({
    id: 'p1', authorId: 'mimi', body: 'hi', createdAt: new Date().toISOString(),
    likes: 0, reposts: 0, origin: 'offline', edited: false, aiGenerated: false,
  });
  await store.createReply({
    id: 'r1', postId: 'p1', authorId: 'coral', body: 'hey', replyOrder: 0,
    origin: 'offline', createdAt: new Date().toISOString(),
  });
  await store.toggleReaction('p1', 'coral', 'like');
  await store.createDm({
    id: 'd1', threadId: 'user:mimi', senderId: 'mimi', body: 'yo',
    createdAt: new Date().toISOString(), origin: 'offline',
  });
  await store.createDm({
    id: 'd2', threadId: 'agent:coral:mimi', senderId: 'coral', body: 'sup',
    createdAt: new Date().toISOString(), origin: 'offline',
  });
  return store;
}

describe('stats', () => {
  it('computes per-persona and today counters', async () => {
    const store = await seeded();
    const mimi = await personaStats(store, 'mimi');
    expect(mimi.posts).toBe(1);
    expect(mimi.likesReceived).toBe(1);
    expect(mimi.dmsToUser).toBe(1);
    expect(mimi.dmsFromUser).toBe(0);
    expect(mimi.dmsToPersonas).toBe(0);
    const coral = await personaStats(store, 'coral');
    expect(coral.replies).toBe(1);
    expect(coral.likesGiven).toBe(1);
    expect(coral.dmsToPersonas).toBe(1);
    const today = await todayStats(store);
    expect(today.posts).toBe(1);
    expect(today.replies).toBe(1);
    expect(today.likes).toBe(1);
    expect(today.dmsToUser).toBe(1);
    expect(today.dmsToPersonas).toBe(1);
  });
});

describe('blockPersona', () => {
  it('removes follow and follower rows with the block', async () => {
    const store = new Store(new Database(await openDatabase('test-block')));
    await store.upsertPersona({
      id: 'z', handle: 'z', displayName: 'Z', role: 'peer', vibe: 't',
      bio: '', avatarSeed: 'z', affinity: 0.5, active: true, spawnedWeek: 0,
    });
    await store.follow('z');
    await store.addFollower('z');
    const social = new SocialStore(store);
    await social.blockPersona('z');
    expect(await store.isBlocked('z')).toBe(true);
    expect(await store.isFollowing('z')).toBe(false);
    expect(await store.listFollowers()).toEqual([]);
  });
});

describe('generatePersona friend path', () => {
  it('falls back to an offline friend without a model', async () => {
    const failing = {
      async chat(): Promise<string> { throw new Error('nope'); },
      offlineReply: (p: string[]) => p[0],
    };
    const res = await generatePersona(failing as never, 'stargazer', [], { allowFriend: true });
    expect(res.via).toBe('offline');
    expect(res.persona.role).toBe('friend');
  });
});
