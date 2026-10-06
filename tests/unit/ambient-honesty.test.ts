import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replyToUserPost } from '../../src/lib/sim-engine';
import { ambientTick, personaToPersonaDms } from '../../src/lib/chatter';
import { friendPing } from '../../src/lib/background';
import {
  getAmbientStatus,
  resetAmbientStatus,
} from '../../src/lib/api/ambient-status';
import { ModelClient } from '../../src/lib/api/model-client';

vi.mock('../../src/lib/api/activity', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/lib/api/activity')>();
  return { ...orig, resolveAmbientClient: vi.fn() };
});

const { resolveAmbientClient: mockedResolve } = await import('../../src/lib/api/activity');
const mockResolve = mockedResolve as unknown as ReturnType<typeof vi.fn>;

function liveClient(text = 'live text') {
  return {
    async chat(): Promise<string> {
      return text;
    },
    offlineReply(pool: string[]) {
      return pool[0];
    },
    async recordAttempt(): Promise<void> {},
  };
}

function failingClient() {
  return {
    async chat(): Promise<string> {
      throw new Error('Auth failed (401)');
    },
    offlineReply(pool: string[]) {
      return pool[0];
    },
    async recordAttempt(): Promise<void> {},
  };
}

const crowd = [
  { id: 'kelp', displayName: 'Kelp', handle: '@kelp', vibe: 'steady', role: 'peer' },
  { id: 'reef', displayName: 'Reef', handle: '@reef', vibe: 'chaotic', role: 'meme' },
];

function personaRows() {
  return [
    { id: 'a', displayName: 'A', active: true },
    { id: 'b', displayName: 'B', active: true },
  ];
}

beforeEach(() => {
  resetAmbientStatus();
  mockResolve.mockReset();
});

describe('sim-engine reply origins', () => {
  it('marks pool fallbacks offline when the endpoint fails', async () => {
    const replies = await replyToUserPost('p1', 'hello', crowd, {
      modelClient: failingClient() as never,
    });
    expect(replies.length).toBeGreaterThan(0);
    for (const r of replies) expect(r.origin).toBe('offline');
    const status = getAmbientStatus();
    expect(status.live).toBe(false);
    expect(status.lastError).toMatch(/401/);
  });

  it('marks endpoint replies glimmer when the endpoint answers', async () => {
    const replies = await replyToUserPost('p1', 'hello', crowd, {
      modelClient: liveClient() as never,
    });
    expect(replies.length).toBeGreaterThan(0);
    for (const r of replies) expect(r.origin).toBe('glimmer');
    expect(getAmbientStatus().live).toBe(true);
  });
});

describe('chatter origins', () => {
  it('persona-to-persona DMs stay offline on failure, glimmer on success', async () => {
    const dms: Array<{ origin: string }> = [];
    const store = {
      async listPersonas() {
        return personaRows();
      },
      async createDm(dm: { origin: string }) {
        dms.push(dm);
      },
    };
    await personaToPersonaDms(store as never, failingClient() as never);
    expect(dms).toHaveLength(2);
    expect(dms.every((d) => d.origin === 'offline')).toBe(true);

    dms.length = 0;
    await personaToPersonaDms(store as never, liveClient() as never);
    expect(dms).toHaveLength(2);
    expect(dms.every((d) => d.origin === 'glimmer')).toBe(true);
  });

  it('ambient posts are glimmer when the endpoint answers', async () => {
    const posts: Array<{ origin: string }> = [];
    const store = {
      async listPersonas() {
        return personaRows();
      },
      async createPost(p: { origin: string }) {
        posts.push(p);
      },
    };
    await ambientTick(store as never, liveClient() as never);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.origin === 'glimmer')).toBe(true);
  });
});

describe('resolveAmbientClient', () => {
  it('never trusts the stale boot-time client', async () => {
    const actual = await vi.importActual<typeof import('../../src/lib/api/activity')>(
      '../../src/lib/api/activity',
    );
    const stale = new ModelClient('https://gw.example', 'old-key', { defaultModel: 'm' });
    const out = await actual.resolveAmbientClient(stale);
    expect(out).not.toBe(stale);
  });
});

describe('friendPing', () => {
  function baseStore() {
    const dms: Array<{ origin: string; body: string }> = [];
    return {
      dms,
      async getPersona() {
        return { id: 'persona-friend', displayName: 'Coral' };
      },
      async createDm(dm: { origin: string; body: string }) {
        dms.push(dm);
      },
    };
  }

  it('records glimmer origin when the live client answers', async () => {
    mockResolve.mockResolvedValue(liveClient());
    const store = baseStore();
    await friendPing(store as never, 'persona-friend', undefined);
    expect(store.dms).toHaveLength(1);
    expect(store.dms[0].origin).toBe('glimmer');
    expect(store.dms[0].body).toBe('live text');
  });

  it('falls back to the offline pool when the live client fails', async () => {
    mockResolve.mockResolvedValue(failingClient());
    const store = baseStore();
    await friendPing(store as never, 'persona-friend', undefined);
    expect(store.dms).toHaveLength(1);
    expect(store.dms[0].origin).toBe('offline');
    expect(getAmbientStatus().lastError).toMatch(/401/);
  });

  it('stays offline when no endpoint is configured', async () => {
    mockResolve.mockResolvedValue(undefined);
    const store = baseStore();
    await friendPing(store as never, 'persona-friend', undefined);
    expect(store.dms).toHaveLength(1);
    expect(store.dms[0].origin).toBe('offline');
  });
});
