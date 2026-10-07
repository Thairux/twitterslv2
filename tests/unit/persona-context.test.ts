import { describe, it, expect } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { loadPersonaContexts, isAsleepAt } from '@/lib/api/persona-context';

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

describe('relationships', () => {
  it('round-trips the founder-style graph', async () => {
    const store = await freshStore('test-graph');
    await store.setRelationship('a', 'b', 'RIVAL', 0.7);
    await store.setRelationship('b', 'a', 'RIVAL', 0.6);
    const rels = await store.listRelationships();
    expect(rels).toHaveLength(2);
    expect(rels.find((r) => r.aId === 'a')).toMatchObject({ bId: 'b', rel: 'RIVAL', weight: 0.7 });
  });

  it('round-trips persona state JSON', async () => {
    const store = await freshStore('test-state');
    expect(await store.getPersonaState('x')).toEqual({});
    await store.setPersonaState('x', { mood: 'spicy', interests: ['debate'] });
    expect(await store.getPersonaState('x')).toMatchObject({ mood: 'spicy' });
  });
});

describe('isAsleepAt', () => {
  it('handles day windows, overnight windows, and 24h owls', () => {
    expect(isAsleepAt({ active_hours: { wake: 7, sleep: 23 } }, 12)).toBe(false);
    expect(isAsleepAt({ active_hours: { wake: 7, sleep: 23 } }, 2)).toBe(true);
    expect(isAsleepAt({ active_hours: { wake: 22, sleep: 6 } }, 2)).toBe(false);
    expect(isAsleepAt({ active_hours: { wake: 22, sleep: 6 } }, 12)).toBe(true);
    expect(isAsleepAt({ active_hours: { wake: 8, sleep: 24 } }, 3)).toBe(false);
    expect(isAsleepAt({}, 3)).toBe(false);
  });
});

describe('loadPersonaContexts', () => {
  it('builds blurbs from state, ties, and memories', async () => {
    const store = await freshStore('test-ctx');
    await store.setRelationship('mimi', 'coral', 'FRIEND', 1.0);
    await store.setPersonaState('mimi', { mood: 'warm', interests: ['music'], goals: ['cheer you up'] });
    await store.createPendingMemory({ id: 'pm1', personaId: 'mimi', fact: 'user likes lighthouses' });
    await store.approveMemory('pm1');
    const ctx = await loadPersonaContexts(store, ['mimi'], { nowHour: 12 });
    const mimi = ctx.get('mimi');
    expect(mimi?.asleep).toBe(false);
    expect(mimi?.blurb).toContain('mood: warm');
    expect(mimi?.blurb).toContain('coral');
    expect(mimi?.blurb).toContain('lighthouses');
  });

  it('marks sleepers asleep and strangers blank', async () => {
    const store = await freshStore('test-ctx-sleep');
    await store.setPersonaState('owl', { active_hours: { wake: 22, sleep: 6 } });
    const ctx = await loadPersonaContexts(store, ['owl', 'stranger'], { nowHour: 12 });
    expect(ctx.get('owl')?.asleep).toBe(true);
    expect(ctx.get('stranger')?.blurb).toBe('');
  });
});
