import type { Persona } from './persona';

export interface MemoryFact {
  id: string;
  personaId: string;
  fact: string;
  embeddingRef?: string;
  consented: boolean;
}

export function canStoreMemory(consented: boolean): boolean {
  return consented === true;
}

export const WORLD_CAP = 1500;
export const WEEKLY_SPAWN = 1;

export interface WorldState {
  currentWeek: number;
  totalSpawned: number;
  daySeed?: number;
  activeSize?: number;
}

export interface PersonaSpawn {
  week: number;
  persona: Persona;
}

export function nextSpawnWeek(currentWeek: number, totalSpawned: number): number | null {
  if (totalSpawned >= WORLD_CAP) return null;
  return currentWeek + 1;
}

export function activeSubsetIds(allIds: string[], week: number, daySeed: number, size = 8): string[] {
  if (allIds.length <= size) return [...allIds];
  const out: string[] = [];
  let i = (week * 7 + daySeed) % allIds.length;
  while (out.length < size) {
    const id = allIds[i % allIds.length];
    if (!out.includes(id)) out.push(id);
    i += 1;
  }
  return out;
}

export function activeSubset(state: WorldState, personas: Persona[], week: number): Persona[] {
  const ids = personas.map((p) => p.id);
  const size = state.activeSize ?? 8;
  const daySeed = state.daySeed ?? 0;
  const selectedIds = activeSubsetIds(ids, week, daySeed, size);
  return selectedIds.map((id) => personas.find((p) => p.id === id)!).filter(Boolean);
}

const SPAWN_NAMES: Array<{ id: string; displayName: string; vibe: string; bio: string }> = [
  { id: 'wahoo', displayName: 'Wahoo', vibe: 'fast fish, faster takes', bio: 'gone before you blink' },
  { id: 'turtle', displayName: 'Turtle', vibe: 'slow thoughts, deep shells', bio: 'century club member' },
  { id: 'dolphin', displayName: 'Dolphin', vibe: 'playful click-speak philosopher', bio: 'echolocating good vibes' },
  { id: 'seahorse', displayName: 'Seahorse', vibe: 'tiny knight of the shallows', bio: 'standing upright since forever' },
  { id: 'clam', displayName: 'Clam', vibe: 'shut tight until it matters', bio: 'happy as one' },
  { id: 'jelly', displayName: 'Jelly', vibe: 'drifting glow poster', bio: 'ninety-five percent good intentions' },
  { id: 'ray', displayName: 'Ray', vibe: 'gliding over drama', bio: 'wings wide, worries narrow' },
  { id: 'eel', displayName: 'Eel', vibe: 'slippery wordsmith', bio: 'shocking, occasionally' },
  { id: 'shrimp', displayName: 'Shrimp', vibe: 'small fry, big crunch', bio: 'cocktail enjoyer' },
  { id: 'lobster', displayName: 'Lobster', vibe: 'red-clawed romantic', bio: 'mates for life, posts for fun' },
  { id: 'crab', displayName: 'Crab', vibe: 'sideways thinker', bio: 'never walks straight into discourse' },
  { id: 'urchin', displayName: 'Urchin', vibe: 'spiky but soft inside', bio: 'handle with care' },
];

export function spawnWeek(state: WorldState, week: number): PersonaSpawn[] {
  if (state.totalSpawned >= WORLD_CAP) return [];
  if (week <= state.currentWeek) return [];
  const newcomer = SPAWN_NAMES[(week - 1) % SPAWN_NAMES.length];
  const id = week <= SPAWN_NAMES.length ? newcomer.id : `${newcomer.id}-${week}`;
  return [
    {
      week,
      persona: {
        id,
        handle: `@${newcomer.id}`,
        displayName: newcomer.displayName,
        role: 'peer',
        vibe: newcomer.vibe,
        bio: newcomer.bio,
        avatarSeed: id,
        affinity: 0.5,
        active: true,
        spawnedWeek: week,
      } as Persona,
    },
  ];
}

export function canSeeDM(a: string, b: string): boolean {
  if (a === b) return true;
  const participants = [a, b].sort();
  const threadId = `agent:${participants.join(':')}`;
  const suffix = threadId.slice(6); // strip 'agent:'
  const parts = suffix.split(':');
  for (let i = 1; i < parts.length; i++) {
    const left = parts.slice(0, i).join(':');
    const right = parts.slice(i).join(':');
    const group = [left, right].sort();
    if (group[0] === participants[0] && group[1] === participants[1]) return true;
  }
  return false;
}

export function userThreadWith(otherId: string): string {
  return `user:${otherId}`;
}
