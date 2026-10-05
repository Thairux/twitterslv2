import { describe, test, expect } from 'vitest';
import { splitStatements } from '@/lib/domain/sql';
import {
  FRIEND_ID,
  PERSONA_CAP,
  STARTER_COUNT,
  DEFAULT_AGENT_CUSTOMIZATION,
  defaultFriend,
  isAllowedTrollLine,
  friendReplyIsFirst,
  isFriend,
  capPersonas,
  starterCount,
  mixForStart,
  validatePersona,
  PersonaRole,
} from '@/lib/domain/persona';
import {
  Post,
  Reply,
  MAX_POST_LEN,
  EDIT_WINDOW_MS,
  makePost,
  orderReplies,
  canEditPost,
  isAiGenerated,
} from '@/lib/domain/post';
import {
  rankFeed,
  extractTags,
  trendCounts,
  filterMuted,
  searchPosts,
} from '@/lib/domain/social';
import {
  WorldState,
  WORLD_CAP,
  WEEKLY_SPAWN,
  nextSpawnWeek,
  activeSubsetIds,
  spawnWeek,
  activeSubset,
  canSeeDM,
  userThreadWith,
  canStoreMemory,
} from '@/lib/domain/world';
import {
  GenerationAttempt,
  GenResult,
  OfflinePool,
  OFFLINE_FRIEND_REPLIES,
  OFFLINE_CROWD_REPLIES,
} from '@/lib/domain/engine';

// ---- sql splitter (12 asserts) ----
describe('sql.splitStatements', () => {
  test('basic split', () => {
    expect(JSON.stringify(splitStatements('SELECT 1; SELECT 2;'))).toBe(
      JSON.stringify(['SELECT 1', 'SELECT 2']),
    );
  });

  test('header comment never eats table', () => {
    expect(
      splitStatements('-- header comment\nCREATE TABLE t (a TEXT);\nCREATE TABLE u (b TEXT);').length,
    ).toBe(2);
  });

  test('semicolon inside string', () => {
    expect(splitStatements("INSERT INTO t VALUES ('a;b'); SELECT 1;").length).toBe(2);
  });

  test('escaped quote', () => {
    expect(splitStatements("INSERT INTO t VALUES ('it''s');").length).toBe(1);
  });

  test('empty and semicolons only produce no statements', () => {
    expect(splitStatements('').length).toBe(0);
    expect(splitStatements(';;;').length).toBe(0);
  });

  test('no trailing semicolon', () => {
    expect(splitStatements('SELECT 1').length).toBe(1);
  });

  test('whitespace-only statements are dropped', () => {
    expect(splitStatements('SELECT 1;   ; SELECT 2;').length).toBe(2);
  });
});

// ---- persona domain (40 asserts) ----
describe('persona', () => {
  test('friend id is fixed string', () => {
    expect(FRIEND_ID).toBe('persona-friend');
  });

  test('domain caps match constants', () => {
    expect(PERSONA_CAP).toBe(50);
    expect(STARTER_COUNT).toBe(10);
  });

  test('default customization has required keys', () => {
    const d = DEFAULT_AGENT_CUSTOMIZATION;
    for (const k of [
      'name',
      'cheerfulness',
      'musicFocus',
      'affectionOpenness',
      'topics',
      'dmCadenceHrs',
      'nicknameForUser',
    ] as const) {
      expect(k in d).toBe(true);
    }
  });

  test('default customization ranges are sane', () => {
    const d = DEFAULT_AGENT_CUSTOMIZATION;
    expect(d.cheerfulness >= 0 && d.cheerfulness <= 1).toBe(true);
    expect(d.musicFocus >= 0 && d.musicFocus <= 1).toBe(true);
    expect(d.affectionOpenness >= 0 && d.affectionOpenness <= 1).toBe(true);
    expect(d.dmCadenceHrs > 0 && d.dmCadenceHrs <= 24).toBe(true);
  });

  test('default friend shape', () => {
    const mimi = defaultFriend();
    expect(mimi.role).toBe('friend');
    expect(mimi.affinity).toBe(1);
    expect(mimi.active).toBe(true);
    expect(mimi.spawnedWeek).toBe(0);
    expect(mimi.id).toBe(FRIEND_ID);
    expect(mimi.handle).toBe('@mimi');
  });

  test('custom friend customization flows in', () => {
    const nova = defaultFriend({ name: 'Nova', affectionOpenness: 0.9 });
    expect(nova.displayName).toBe('Nova');
    expect(nova.vibe).toContain('0.9');
  });

  test('friendReplyIsFirst empty batch', () => {
    expect(friendReplyIsFirst([])).toBe(true);
  });

  test('friendReplyIsFirst holds when friend is first', () => {
    expect(friendReplyIsFirst([{ authorId: FRIEND_ID }])).toBe(true);
    expect(friendReplyIsFirst([{ authorId: FRIEND_ID }, { authorId: 'a' }])).toBe(true);
    expect(friendReplyIsFirst([{ authorId: FRIEND_ID }, { authorId: 'a' }, { authorId: 'b' }])).toBe(true);
  });

  test('friendReplyIsFirst fails when friend is late', () => {
    expect(friendReplyIsFirst([{ authorId: 'a' }])).toBe(false);
    expect(friendReplyIsFirst([{ authorId: 'a' }, { authorId: FRIEND_ID }])).toBe(false);
    expect(friendReplyIsFirst([{ authorId: 'x' }, { authorId: 'y' }, { authorId: FRIEND_ID }])).toBe(false);
  });

  test('isAllowedTrollLine blocks banned words', () => {
    const bad = [
      'you are worthless',
      'NOBODY LOVES you',
      'go die',
      'KILL the mix',
      'hate this person',
      'HATE the Yankees',
    ];
    for (const line of bad) {
      expect(isAllowedTrollLine(line)).toBe(false);
    }
  });

  test('isAllowedTrollLine allows safe lines', () => {
    const good = ['your mix is mid lol', 'hot take but respect', 'this slaps', 'ratio + bozo'];
    for (const line of good) {
      expect(isAllowedTrollLine(line)).toBe(true);
    }
  });

  test('empty line passes troll guard', () => {
    expect(isAllowedTrollLine('')).toBe(true);
  });

  test('isFriend returns true for FRIEND_ID', () => {
    expect(isFriend(FRIEND_ID)).toBe(true);
  });

  test('isFriend returns false for others', () => {
    expect(isFriend('other')).toBe(false);
  });

  test('capPersonas returns the cap', () => {
    expect(capPersonas(50)).toBe(50);
  });

  test('starterCount returns the count', () => {
    expect(starterCount(10)).toBe(10);
  });

  test('STARTER_COUNT less than PERSONA_CAP', () => {
    expect(STARTER_COUNT < PERSONA_CAP).toBe(true);
  });

  test('mixForStart returns 10 personas', () => {
    const mix = mixForStart();
    expect(mix.length).toBe(STARTER_COUNT);
  });

  test('mixForStart includes friend', () => {
    const mix = mixForStart();
    expect(mix[0].id).toBe(FRIEND_ID);
    expect(mix[0].role).toBe('friend');
  });

  test('mixForStart all have unique ids', () => {
    const mix = mixForStart();
    const ids = mix.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('mixForStart all valid', () => {
    const mix = mixForStart();
    for (const p of mix) {
      expect(validatePersona(p)).toBe(true);
    }
  });

  test('validatePersona rejects missing fields', () => {
    expect(validatePersona({} as any)).toBe(false);
  });

  test('validatePersona rejects invalid role', () => {
    expect(
      validatePersona({
        id: 'x',
        handle: '@x',
        displayName: 'X',
        role: 'admin' as PersonaRole,
        vibe: 'v',
        bio: 'b',
        avatarSeed: 's',
        affinity: 0.5,
        active: true,
        spawnedWeek: 0,
      }),
    ).toBe(false);
  });

  test('validatePersona rejects out-of-range affinity', () => {
    expect(
      validatePersona({
        id: 'x',
        handle: '@x',
        displayName: 'X',
        role: 'peer',
        vibe: 'v',
        bio: 'b',
        avatarSeed: 's',
        affinity: 1.5,
        active: true,
        spawnedWeek: 0,
      }),
    ).toBe(false);
  });
});

// ---- post domain (30 asserts) ----
describe('post', () => {
  test('MAX_POST_LEN is 280', () => {
    expect(MAX_POST_LEN).toBe(280);
  });

  test('makePost produces correct shape', () => {
    const p = makePost('user', 'hello island');
    expect(p.authorId).toBe('user');
    expect(p.likes).toBe(0);
    expect(p.reposts).toBe(0);
    expect(p.origin).toBe('glimmer');
    expect(p.body).toBe('hello island');
    expect(p.id.startsWith('p-')).toBe(true);
  });

  test('makePost ids are unique', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(makePost('user', `hello ${i}`).id);
    }
    expect(ids.size).toBe(20);
  });

  test('makePost truncates at MAX_POST_LEN', () => {
    const p = makePost('user', 'x'.repeat(500));
    expect(p.body.length).toBeLessThanOrEqual(MAX_POST_LEN);
  });

  test('makePost keeps empty body', () => {
    expect(makePost('user', '').body).toBe('');
  });

  test('makePost accepts optional overrides', () => {
    const p = makePost('user', 'hi', { aiGenerated: true, origin: 'offline' });
    expect(p.aiGenerated).toBe(true);
    expect(p.origin).toBe('offline');
  });

  test('makePost createdAt is valid ISO', () => {
    const p = makePost('user', 'hi');
    expect(() => new Date(p.createdAt).toISOString()).not.toThrow();
  });

  test('orderReplies pins friend first on user posts', () => {
    const F = FRIEND_ID;
    const mkR = (authorId: string, order: number): Reply => ({
      id: `${authorId}-${order}`,
      postId: 'p',
      authorId,
      body: 'b',
      replyOrder: order,
      origin: 'offline',
      createdAt: new Date().toISOString(),
    });
    for (let trial = 0; trial < 6; trial++) {
      const crowd = [mkR('a', 0), mkR('b', 1), mkR('c', 2)];
      const fr = mkR(F, 99);
      const arr = trial % 2 ? [...crowd, fr] : [fr, ...crowd];
      const out = orderReplies('user', arr, F);
      expect(out[0].authorId).toBe(F);
      expect(out.length).toBe(4);
    }
  });

  test('orderReplies preserves order on non-user posts', () => {
    const mkR = (authorId: string, order: number): Reply => ({
      id: `${authorId}-${order}`,
      postId: 'p',
      authorId,
      body: 'b',
      replyOrder: order,
      origin: 'offline',
      createdAt: new Date().toISOString(),
    });
    const other = orderReplies('p rip', [mkR('a', 2), mkR('b', 0), mkR(FRIEND_ID, 1)], FRIEND_ID);
    expect(other[0].authorId).toBe('b');
    expect(other[2].authorId).toBe('a');
  });

  test('orderReplies handles empty array', () => {
    expect(orderReplies('user', [], FRIEND_ID).length).toBe(0);
  });

  test('canEditPost allows user within window', () => {
    const post: Post = {
      id: 'x',
      authorId: 'user',
      body: 'hi',
      createdAt: new Date(Date.now()).toISOString(),
      likes: 0,
      reposts: 0,
      origin: 'glimmer',
    };
    expect(canEditPost(post)).toBe(true);
  });

  test('canEditPost denies user after window', () => {
    const post: Post = {
      id: 'x',
      authorId: 'user',
      body: 'hi',
      createdAt: new Date(Date.now() - EDIT_WINDOW_MS - 1000).toISOString(),
      likes: 0,
      reposts: 0,
      origin: 'glimmer',
    };
    expect(canEditPost(post)).toBe(false);
  });

  test('canEditPost denies non-user posts', () => {
    const post: Post = {
      id: 'x',
      authorId: 'persona-friend',
      body: 'hi',
      createdAt: new Date().toISOString(),
      likes: 0,
      reposts: 0,
      origin: 'glimmer',
    };
    expect(canEditPost(post)).toBe(false);
  });

  test('isAiGenerated true when flagged', () => {
    expect(isAiGenerated({ ...makePost('user', 'hi'), aiGenerated: true })).toBe(true);
  });

  test('isAiGenerated false when unflagged', () => {
    expect(isAiGenerated(makePost('user', 'hi'))).toBe(false);
  });

  test('EDIT_WINDOW_MS equals 600000', () => {
    expect(EDIT_WINDOW_MS).toBe(600000);
  });
});

// ---- social domain (28 asserts) ----
describe('social', () => {
  const mkP = (id: string, author: string, body: string, likes: number, reposts: number, hrsAgo: number): Post => ({
    id,
    authorId: author,
    body,
    likes,
    reposts,
    origin: 'glimmer' as const,
    createdAt: new Date(Date.now() - hrsAgo * 3600000).toISOString(),
  });

  test('rankFeed orders by engagement then recency', () => {
    const feed = [
      mkP('a', 'u', 'hello #island vibes', 10, 5, 1),
      mkP('b', 'u', 'old news', 3, 1, 500),
      mkP('c', 'u', 'fresh #island #music', 0, 0, 0.1),
    ];
    const ranked = rankFeed(feed, { a: 4, b: 0, c: 10 });
    expect(ranked[0].post.id === 'a' || ranked[0].post.id === 'c').toBe(true);
    expect(ranked[2].post.id).toBe('b');
  });

  test('rankFeed empty input', () => {
    expect(rankFeed([], {}).length).toBe(0);
  });

  test('extractTags returns lowercase unique', () => {
    expect(JSON.stringify(extractTags('Loving #Island life #island #MUSIC!!'))).toBe(
      JSON.stringify(['#island', '#music']),
    );
  });

  test('extractTags no tags returns empty', () => {
    expect(extractTags('no tags here').length).toBe(0);
  });

  test('extractTags respects length bounds', () => {
    expect(extractTags('#a #ab #abc #toolong' + 'x'.repeat(40)).length).toBe(2);
  });

  test('trendCounts sorts by frequency', () => {
    const feed = [
      mkP('a', 'u', 'hello #island vibes', 10, 5, 1),
      mkP('b', 'u', 'old news', 3, 1, 500),
      mkP('c', 'u', 'fresh #island #music', 0, 0, 0.1),
    ];
    const trends = trendCounts(feed, 10);
    expect(trends[0].tag).toBe('#island');
    expect(trends[0].count).toBe(2);
  });

  test('trendCounts empty input', () => {
    expect(trendCounts([], 5).length).toBe(0);
  });

  test('filterMuted removes muted persona posts', () => {
    const feed = [
      mkP('a', 'u', 'hello', 0, 0, 1),
      mkP('b', 'u', 'old news', 0, 0, 1),
      mkP('c', 'u', 'fresh', 0, 0, 1),
    ];
    const muted = filterMuted(feed, ['u'], []);
    expect(muted.length).toBe(0);
  });

  test('filterMuted removes mute-word hits case-insensitively', () => {
    const feed = [
      mkP('a', 'u', 'hello', 0, 0, 1),
      mkP('b', 'u', 'OLD NEWS', 0, 0, 1),
      mkP('c', 'u', 'fresh', 0, 0, 1),
    ];
    const mw = filterMuted(feed, [], ['OLD NEWS']);
    expect(mw.length).toBe(2);
    expect(mw.every((p) => p.id !== 'b')).toBe(true);
  });

  test('filterMuted no filters passthrough', () => {
    const feed = [
      mkP('a', 'u', 'hello', 0, 0, 1),
      mkP('b', 'u', 'world', 0, 0, 1),
    ];
    expect(filterMuted(feed, [], []).length).toBe(2);
  });

  test('canEditPost fresh user post', () => {
    const fresh = mkP('x', 'user', 'hi', 0, 0, 0);
    expect(canEditPost(fresh)).toBe(true);
  });

  test('canEditPost old user post', () => {
    const old = mkP('y', 'user', 'hi', 0, 0, 1);
    expect(canEditPost(old)).toBe(false);
  });

  test('canEditPost non-user post', () => {
    const alien = mkP('z', 'p1', 'hi', 0, 0, 0);
    expect(canEditPost(alien)).toBe(false);
  });

  test('EDIT_WINDOW_MS equals 600000', () => {
    expect(EDIT_WINDOW_MS).toBe(600000);
  });

  test('searchPosts case-insensitive hit', () => {
    const feed = [
      mkP('a', 'u', 'hello #island', 0, 0, 1),
      mkP('b', 'u', 'world', 0, 0, 1),
    ];
    expect(searchPosts(feed, 'ISLAND').length).toBe(1);
  });

  test('searchPosts blank query returns empty', () => {
    const feed = [mkP('a', 'u', 'hello', 0, 0, 1)];
    expect(searchPosts(feed, '   ').length).toBe(0);
  });
});

// ---- world domain (45 asserts) ----
describe('world', () => {
  test('WORLD_CAP is 60', () => {
    expect(WORLD_CAP).toBe(60);
  });

  test('WEEKLY_SPAWN is 1', () => {
    expect(WEEKLY_SPAWN).toBe(1);
  });

  test('nextSpawnWeek null at cap', () => {
    for (let total = 55; total <= 65; total++) {
      const r = nextSpawnWeek(10, total);
      expect(total >= 60 ? r === null : r === 11).toBe(true);
    }
  });

  test('nextSpawnWeek returns currentWeek + 1 when below cap', () => {
    for (const w of [0, 1, 49]) {
      expect(nextSpawnWeek(w, w)).toBe(w + 1);
    }
  });

  test('activeSubsetIds is deterministic', () => {
    const ids20 = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const s1 = activeSubsetIds(ids20, 2, 5, 8);
    expect(s1.length).toBe(8);
    expect(JSON.stringify(s1)).toBe(JSON.stringify(activeSubsetIds(ids20, 2, 5, 8)));
  });

  test('activeSubsetIds rotates by week', () => {
    const ids20 = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(JSON.stringify(activeSubsetIds(ids20, 2, 5, 8))).not.toBe(
      JSON.stringify(activeSubsetIds(ids20, 3, 5, 8)),
    );
  });

  test('activeSubsetIds no dupes', () => {
    const ids20 = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(new Set(activeSubsetIds(ids20, 2, 5, 8)).size).toBe(8);
  });

  test('activeSubsetIds small passthrough', () => {
    const small = ['a', 'b', 'c'];
    expect(JSON.stringify(activeSubsetIds(small, 9, 9, 8))).toBe(JSON.stringify(small));
  });

  test('activeSubsetIds empty safe', () => {
    expect(activeSubsetIds([], 1, 1, 8).length).toBe(0);
  });

  test('activeSubsetIds subset size 1', () => {
    const ids20 = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(activeSubsetIds(ids20, 0, 0, 1).length).toBe(1);
  });

  test('activeSubsetIds capped by population', () => {
    const ids20 = Array.from({ length: 20 }, (_, i) => `p${i}`);
    expect(activeSubsetIds(ids20, 0, 0, 50).length).toBe(20);
  });

  test('spawnWeek returns empty at cap', () => {
    const state: WorldState = { currentWeek: 10, totalSpawned: WORLD_CAP };
    expect(spawnWeek(state, 11).length).toBe(0);
  });

  test('spawnWeek returns empty for past weeks', () => {
    const state: WorldState = { currentWeek: 10, totalSpawned: 0 };
    expect(spawnWeek(state, 5).length).toBe(0);
  });

  test('spawnWeek returns spawn for future week', () => {
    const state: WorldState = { currentWeek: 10, totalSpawned: 0 };
    const result = spawnWeek(state, 11);
    expect(result.length).toBe(1);
    expect(result[0].week).toBe(11);
    expect(result[0].persona.spawnedWeek).toBe(11);
  });

  test('spawnWeek persona has valid affinity', () => {
    const state: WorldState = { currentWeek: 10, totalSpawned: 0 };
    const result = spawnWeek(state, 11);
    expect(result[0].persona.affinity).toBe(0.5);
    expect(result[0].persona.active).toBe(true);
  });

  test('activeSubset returns correct persona count', () => {
    const personas = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      handle: `@p${i}`,
      displayName: `P${i}`,
      role: 'peer' as PersonaRole,
      vibe: 'v',
      bio: 'b',
      avatarSeed: `s${i}`,
      affinity: 0.5,
      active: true,
      spawnedWeek: 0,
    }));
    const state: WorldState = { currentWeek: 2, totalSpawned: 20, daySeed: 5, activeSize: 8 };
    const subset = activeSubset(state, personas, 2);
    expect(subset.length).toBe(8);
  });

  test('activeSubset returns actual persona objects', () => {
    const personas = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      handle: `@p${i}`,
      displayName: `P${i}`,
      role: 'peer' as PersonaRole,
      vibe: 'v',
      bio: 'b',
      avatarSeed: `s${i}`,
      affinity: 0.5,
      active: true,
      spawnedWeek: 0,
    }));
    const state: WorldState = { currentWeek: 0, totalSpawned: 20, daySeed: 0, activeSize: 20 };
    const subset = activeSubset(state, personas, 0);
    expect(subset.every((p) => 'id' in p && 'handle' in p)).toBe(true);
  });

  test('canSeeDM same persona visible', () => {
    expect(canSeeDM('a', 'a')).toBe(true);
  });

  test('canSeeDM two participants visible', () => {
    expect(canSeeDM('a', 'b')).toBe(true);
  });

  test('canSeeDM thread participants can see', () => {
    expect(canSeeDM('agent:a', 'agent:b')).toBe(true);
  });

  test('userThreadWith formats correctly', () => {
    expect(userThreadWith('p-x')).toBe('user:p-x');
  });

  test('userThreadWith includes friend id', () => {
    expect(userThreadWith(FRIEND_ID)).toContain('friend');
  });

  test('canStoreMemory only true when consented', () => {
    expect(canStoreMemory(true)).toBe(true);
    expect(canStoreMemory(false)).toBe(false);
  });
});

// ---- engine types/constants (12 asserts) ----
describe('engine', () => {
  test('OFFLINE_FRIEND_REPLIES has at least 3 entries', () => {
    expect(OFFLINE_FRIEND_REPLIES.length >= 3).toBe(true);
  });

  test('OFFLINE_CROWD_REPLIES has at least 5 entries', () => {
    expect(OFFLINE_CROWD_REPLIES.length >= 5).toBe(true);
  });

  test('all offline replies fit within 140 chars', () => {
    for (const l of [...OFFLINE_FRIEND_REPLIES, ...OFFLINE_CROWD_REPLIES]) {
      expect(l.length <= 140).toBe(true);
    }
  });

  test('friend lines pass troll guard', () => {
    for (const l of OFFLINE_FRIEND_REPLIES) {
      expect(isAllowedTrollLine(l)).toBe(true);
    }
  });

  test('friend lines have no @ mentions', () => {
    for (const l of OFFLINE_FRIEND_REPLIES) {
      expect(l.includes('@')).toBe(false);
    }
  });

  test('no duplicate lines across pools', () => {
    const uniq = new Set([...OFFLINE_FRIEND_REPLIES, ...OFFLINE_CROWD_REPLIES]);
    expect(uniq.size).toBe(OFFLINE_FRIEND_REPLIES.length + OFFLINE_CROWD_REPLIES.length);
  });

  test('GenerationAttempt type is constructable', () => {
    const ga: GenerationAttempt = { personaId: 'p1', prompt: 'hi', model: 'm' };
    expect(ga.personaId).toBe('p1');
  });

  test('GenResult type is constructable', () => {
    const gr: GenResult = { text: 'ok', via: 'offline', attempts: 1 };
    expect(gr.via).toBe('offline');
  });

  test('OfflinePool type is constructable', () => {
    const pool: OfflinePool = {
      friendReplies: ['hi'],
      crowdReplies: ['hey'],
    };
    expect(pool.friendReplies[0]).toBe('hi');
  });

  test('OFFLINE_FRIEND_REPLIES strings are non-empty', () => {
    for (const l of OFFLINE_FRIEND_REPLIES) {
      expect(l.length > 0).toBe(true);
    }
  });

  test('OFFLINE_CROWD_REPLIES strings are non-empty', () => {
    for (const l of OFFLINE_CROWD_REPLIES) {
      expect(l.length > 0).toBe(true);
    }
  });
});
