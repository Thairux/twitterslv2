import { describe, it, expect } from 'vitest';
import { respondToPost } from '../../src/lib/api/activity';
import type { PersonaRole } from '../../src/lib/domain/persona';
import type { Reply } from '../../src/lib/domain/post';

function makeStore() {
  const personas: Array<{ id: string; displayName: string; handle: string; vibe: string; role: PersonaRole; active: boolean; bio: string; avatarSeed: string; affinity: number; spawnedWeek: number }> = [
    { id: 'coral', displayName: 'Coral', handle: 'coral', vibe: 'cheerful', role: 'friend', active: true, bio: '', avatarSeed: 'coral', affinity: 1, spawnedWeek: 0 },
    { id: 'kelp', displayName: 'Kelp', handle: 'kelp', vibe: 'steady', role: 'peer', active: true, bio: '', avatarSeed: 'kelp', affinity: 0.6, spawnedWeek: 0 },
    { id: 'reef', displayName: 'Reef', handle: 'reef', vibe: 'chaotic', role: 'meme', active: true, bio: '', avatarSeed: 'reef', affinity: 0.5, spawnedWeek: 0 },
  ];
  const replies: Reply[] = [];
  return {
    personas,
    replies,
    async listPersonas() { return personas; },
    async listReplies() { return replies; },
    async createReply(r: Reply) { replies.push(r); },
    async getAgentConfig(key: string) { return { key, value: 'hybrid' }; },
    async listRelationships(): Promise<never[]> { return []; },
    async getPersonaState(): Promise<Record<string, unknown>> { return {}; },
    async query(): Promise<never[]> { return []; },
    async getPost() { return null; },
    async listFollowing(): Promise<string[]> { return []; },
  };
}

function makeSocial() {
  const likedBy = new Set<string>();
  return {
    likedBy,
    async isLiked(postId: string, personaId: string) { return likedBy.has(`${postId}:${personaId}`); },
    async toggleLike(postId: string, personaId: string) { likedBy.add(`${postId}:${personaId}`); },
  };
}

async function flush(ms = 20) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('respondToPost', () => {
  it('persists friend-first replies and rains likes', async () => {
    const store = makeStore();
    const social = makeSocial();
    const failingClient = {
      async chat(): Promise<string> { throw new Error('offline'); },
      offlineReply(pool: string[]) { return pool[0]; },
    };
    const scheduled: Array<() => void | Promise<void>> = [];
    respondToPost(social, store, failingClient as never, 'p1', 'hello island', (_delay, fn) => {
      scheduled.push(fn);
    });
    // Reply batch builds async (model fallback); let it schedule first.
    await flush();
    expect(scheduled.length).toBeGreaterThan(0);
    for (const fn of scheduled) await fn();
    // Friend reply (FRIEND_ID) persisted first among replies.
    expect(store.replies.length).toBeGreaterThan(0);
    expect(store.replies[0].authorId).toBe('persona-friend');
    // Likes from personas recorded.
    expect(social.likedBy.size).toBeGreaterThanOrEqual(2);
  });
});
