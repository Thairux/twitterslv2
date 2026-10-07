import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { respondToPost } from '@/lib/api/activity';
import type { Reply } from '@/lib/domain/post';

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

describe('muted-word rules', () => {
  it('scopes surfaces and prunes expiry', async () => {
    const store = await freshStore('test-rules');
    await store.upsertMutedWordRule('storm', ['timeline'], null);
    await store.upsertMutedWordRule(
      'rain', ['timeline', 'replies'],
      new Date(Date.now() - 1000).toISOString(),
    );
    expect(await store.listActiveMutedWords('timeline')).toEqual(['storm']);
    expect(await store.listActiveMutedWords('replies')).toEqual([]);
    // Expired rule pruned from storage.
    expect((await store.listMutedWordRules()).map((r) => r.word)).toEqual(['storm']);
    await store.removeMutedWordRule('storm');
    expect(await store.listActiveMutedWords('timeline')).toEqual([]);
  });
});

describe('reply audience gate', () => {
  function mockStore(post: { replyControl: 'everyone' | 'followed' | 'mentioned' } | null, following: string[]) {
    const replies: Reply[] = [];
    return {
      replies,
      async listPersonas() {
        return [
          { id: 'coral', displayName: 'Coral', handle: 'coral', vibe: 'bubbly', role: 'friend', active: true },
          { id: 'kelp', displayName: 'Kelp', handle: 'kelp', vibe: 'steady', role: 'peer', active: true },
          { id: 'reef', displayName: 'Reef', handle: 'reef', vibe: 'spicy', role: 'meme', active: true },
        ];
      },
      async listReplies() { return replies; },
      async createReply(r: Reply) { replies.push(r); },
      async getAgentConfig(key: string) { return { key, value: 'hybrid' }; },
      async listRelationships(): Promise<never[]> { return []; },
      async getPersonaState(): Promise<Record<string, unknown>> { return {}; },
      async query(): Promise<never[]> { return []; },
      async getPost() { return post ? { replyControl: post.replyControl } : null; },
      async listFollowing(): Promise<string[]> { return following; },
    };
  }

  function mockSocial() {
    const likedBy = new Set<string>();
    return {
      async isLiked(postId: string, personaId: string) { return likedBy.has(`${postId}:${personaId}`); },
      async toggleLike(postId: string, personaId: string) { likedBy.add(`${postId}:${personaId}`); },
    };
  }

  const noClient = {
    async chat(): Promise<string> { throw new Error('no endpoint'); },
    offlineReply(pool: string[]) { return pool[0]; },
  };

  async function flush(ms = 30) {
    await new Promise((r) => setTimeout(r, ms));
  }

  async function runGate(post: { replyControl: 'everyone' | 'followed' | 'mentioned' } | null, body: string, following: string[]): Promise<Reply[]> {
    const store = mockStore(post, following);
    const scheduled: Array<() => void | Promise<void>> = [];
    respondToPost(mockSocial(), store as never, noClient as never, 'p1', body, (_d, fn) => {
      scheduled.push(fn);
    });
    await flush();
    for (const fn of scheduled) await fn();
    return store.replies;
  }

  it('everyone lets the whole crowd through', async () => {
    const replies = await runGate({ replyControl: 'everyone' }, 'hello island', []);
    expect(replies.map((r) => r.authorId).sort()).toEqual(['kelp', 'persona-friend', 'reef']);
  });

  it('followed keeps the friend and drops unfollowed personas', async () => {
    const replies = await runGate({ replyControl: 'followed' }, 'hello island', ['kelp']);
    expect(replies.map((r) => r.authorId).sort()).toEqual(['kelp', 'persona-friend']);
  });

  it('mentioned keeps the friend and mentioned personas only', async () => {
    const replies = await runGate({ replyControl: 'mentioned' }, 'hey @reef listen', []);
    expect(replies.map((r) => r.authorId).sort()).toEqual(['persona-friend', 'reef']);
  });
});
