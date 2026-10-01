// TwitterSL v2 — seed data (Sprint 2).
// WARNING: seeds are clearly-fake starter personas.
// Never port prototype joke tweets (e.g. @bramble demo posts) into seeds;
// v1 masterplan explicitly bans fake demo data leaking into the app.

export interface SeedPersona {
  id: string;
  handle: string;
  display_name: string;
  role: 'friend' | 'fan' | 'peer' | 'meme' | 'troll' | 'news';
  vibe: string;
  bio: string;
  avatar_seed: string;
  affinity: number;
  active: number;
  spawned_week: number;
}

export const SEED_PERSONAS: SeedPersona[] = [
  {
    id: 'coral',
    handle: 'coral',
    display_name: 'Coral',
    role: 'friend',
    vibe: 'cheerful island buddy, supportive but honest',
    bio: 'here for the good vibes',
    avatar_seed: 'coral',
    affinity: 1.0,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'kelp',
    handle: 'kelp',
    display_name: 'Kelp',
    role: 'peer',
    vibe: 'steady and curious explorer',
    bio: 'exploring the tides',
    avatar_seed: 'kelp',
    affinity: 0.6,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'breeze',
    handle: 'breeze',
    display_name: 'Breeze',
    role: 'peer',
    vibe: 'light and whimsical drifter',
    bio: 'riding the trade winds',
    avatar_seed: 'breeze',
    affinity: 0.6,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'nemo',
    handle: 'nemo',
    display_name: 'Nemo',
    role: 'peer',
    vibe: 'playful deep-diver',
    bio: 'always diving deeper',
    avatar_seed: 'nemo',
    affinity: 0.6,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'fin',
    handle: 'fin',
    display_name: 'Fin',
    role: 'fan',
    vibe: 'enthusiastic supporter',
    bio: 'big fan energy',
    avatar_seed: 'fin',
    affinity: 0.8,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'wave',
    handle: 'wave',
    display_name: 'Wave',
    role: 'fan',
    vibe: 'chill hype machine',
    bio: 'catching good waves',
    avatar_seed: 'wave',
    affinity: 0.75,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'reef',
    handle: 'reef',
    display_name: 'Reef',
    role: 'meme',
    vibe: 'chaotic good shitposter',
    bio: 'reef-approved memes only',
    avatar_seed: 'reef',
    affinity: 0.5,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'drift',
    handle: 'drift',
    display_name: 'Drift',
    role: 'news',
    vibe: 'island news reporter',
    bio: 'what happened while you were away',
    avatar_seed: 'drift',
    affinity: 0.5,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'echo',
    handle: 'echo',
    display_name: 'Echo',
    role: 'news',
    vibe: 'trend tracker and echo chamber',
    bio: 'echoing the island pulse',
    avatar_seed: 'echo',
    affinity: 0.5,
    active: 1,
    spawned_week: 0,
  },
  {
    id: 'glitch',
    handle: 'glitch',
    display_name: 'Glitch',
    role: 'troll',
    vibe: 'contrarian but clean — no hate, just friction',
    bio: 'change my mind (politely)',
    avatar_seed: 'glitch',
    affinity: 0.35,
    active: 1,
    spawned_week: 0,
  },
];
