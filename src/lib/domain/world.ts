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

export const WORLD_CAP = 50;
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

export function spawnWeek(state: WorldState, week: number): PersonaSpawn[] {
  if (state.totalSpawned >= WORLD_CAP) return [];
  if (week <= state.currentWeek) return [];
  return [
    {
      week,
      persona: {
        id: `spawned-${week}`,
        handle: `@spawned-${week}`,
        displayName: `Spawned ${week}`,
        role: 'peer',
        vibe: '',
        bio: '',
        avatarSeed: `spawned-${week}`,
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
