// Pure domain: personas. No Capacitor/SQLite/fetch imports allowed here.

export type PersonaRole = 'friend' | 'fan' | 'peer' | 'meme' | 'troll' | 'news';

export interface Persona {
  id: string;
  handle: string;
  displayName: string;
  role: PersonaRole;
  vibe: string;
  bio: string;
  avatarSeed: string;
  affinity: number; // 0..1 toward user
  active: boolean;
  spawnedWeek: number;
}

export interface AgentCustomization {
  name: string;
  cheerfulness: number; // 0..1
  musicFocus: number; // 0..1
  affectionOpenness: number; // 0 = deeply hidden, 1 = near-confession
  topics: string[];
  dmCadenceHrs: number;
  nicknameForUser: string;
}

export const PERSONA_CAP = 50;
export const STARTER_COUNT = 10;
export const FRIEND_ID = 'persona-friend';

export const DEFAULT_AGENT_CUSTOMIZATION: AgentCustomization = {
  name: 'Mimi',
  cheerfulness: 0.9,
  musicFocus: 0.85,
  affectionOpenness: 0.25,
  topics: ['music', 'songs', 'concerts', 'daily life'],
  dmCadenceHrs: 3,
  nicknameForUser: 'you',
};

export function defaultFriend(custom: Partial<AgentCustomization> = {}): Persona {
  const c = { ...DEFAULT_AGENT_CUSTOMIZATION, ...custom };
  return {
    id: FRIEND_ID,
    handle: '@mimi',
    displayName: c.name,
    role: 'friend',
    vibe: `cheerful music girl; supportive advisor; secretly fond of the user (openness ${c.affectionOpenness})`,
    bio: 'always here for you',
    avatarSeed: 'friend-mimi',
    affinity: 1.0,
    active: true,
    spawnedWeek: 0,
  };
}

export function isFriend(id: string): boolean {
  return id === FRIEND_ID;
}

export function capPersonas(n: number): number {
  return Math.min(n, PERSONA_CAP);
}

export function starterCount(n: number): number {
  return Math.min(n, STARTER_COUNT);
}

function makeStubPersona(id: string, role: PersonaRole, week: number): Persona {
  return {
    id,
    handle: `@${id}`,
    displayName: id,
    role,
    vibe: '',
    bio: '',
    avatarSeed: id,
    affinity: 0.5,
    active: true,
    spawnedWeek: week,
  };
}

export function mixForStart(): Persona[] {
  const mix: Persona[] = [];
  const used = new Set<string>();

  const add = (role: PersonaRole, label: string) => {
    let id = label;
    while (used.has(id)) id = `${label}-${used.size}`;
    used.add(id);
    mix.push(makeStubPersona(id, role, 0));
  };

  // 1 friend
  mix.push(defaultFriend());
  used.add(FRIEND_ID);

  // 2 fans
  add('fan', 'fan-1');
  add('fan', 'fan-2');

  // 4 peers (within 3-4 range to hit 10 total)
  add('peer', 'peer-1');
  add('peer', 'peer-2');
  add('peer', 'peer-3');
  add('peer', 'peer-4');

  // 1 meme
  add('meme', 'meme-1');

  // 1 troll
  add('troll', 'troll-1');

  // 1 news
  add('news', 'news-1');

  return mix;
}

export function validatePersona(p: Persona): boolean {
  if (!p || typeof p !== 'object') return false;
  const required = [
    'id',
    'handle',
    'displayName',
    'role',
    'vibe',
    'bio',
    'avatarSeed',
    'affinity',
    'active',
    'spawnedWeek',
  ] as const;
  for (const key of required) {
    if (!(key in p)) return false;
  }
  if (typeof p.id !== 'string' || p.id.length === 0) return false;
  if (typeof p.handle !== 'string') return false;
  if (typeof p.displayName !== 'string') return false;
  if (typeof p.vibe !== 'string') return false;
  if (typeof p.bio !== 'string') return false;
  if (typeof p.avatarSeed !== 'string') return false;
  if (typeof p.affinity !== 'number' || p.affinity < 0 || p.affinity > 1) return false;
  if (typeof p.active !== 'boolean') return false;
  if (typeof p.spawnedWeek !== 'number') return false;
  const validRoles: PersonaRole[] = ['friend', 'fan', 'peer', 'meme', 'troll', 'news'];
  if (!validRoles.includes(p.role)) return false;
  return true;
}

/** Troll guardrail: friction yes, hate/harassment never. */
export function isAllowedTrollLine(line: string): boolean {
  const banned = ['hate', 'kill', 'die', 'worthless', 'nobody loves'];
  const low = line.toLowerCase();
  return !banned.some((w) => low.includes(w));
}

/** Friend invariant check for a reply batch on a user post. */
export function friendReplyIsFirst(replies: { authorId: string }[]): boolean {
  if (replies.length === 0) return true;
  return replies[0].authorId === FRIEND_ID;
}
