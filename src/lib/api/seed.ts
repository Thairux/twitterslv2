import { Store } from './store';
import { SEED_PERSONAS } from '../../store/seeds';

export class SeedService {
  constructor(private store: Store) {}

  async seedIfEmpty(): Promise<boolean> {
    const existing = await this.store.listPersonas();
    const firstSeed = existing.length === 0;
    const existingIds = new Set(existing.map((p) => p.id));

    // Backfill-safe: upsert any seed persona missing from this install
    // (e.g. persona-friend on installs seeded before it existed).
    for (const p of SEED_PERSONAS) {
      if (!firstSeed && existingIds.has(p.id)) continue;
      await this.store.upsertPersona({
        id: p.id,
        handle: p.handle,
        displayName: p.display_name,
        role: p.role,
        vibe: p.vibe,
        bio: p.bio,
        avatarSeed: p.avatar_seed,
        affinity: p.affinity,
        active: p.active === 1,
        spawnedWeek: p.spawned_week,
      });
    }

    const cfg = await this.store.getAgentConfig('spawn_state');
    if (!cfg) {
      await this.store.setAgentConfig('spawn_state', JSON.stringify({ currentWeek: 0, totalSpawned: SEED_PERSONAS.length }));
    }
    // One primary friend for the Friend tab (resolves the multi-friend
    // identity question; friend creator overwrites on confirm).
    const primary = await this.store.getAgentConfig('primary_friend_id');
    if (!primary) {
      await this.store.setAgentConfig('primary_friend_id', 'persona-friend');
    }

    // The island starts alive: the user follows Mimi + 4 personas,
    // and Mimi + 6 personas follow back. INSERT OR IGNORE: safe to re-run.
    const ids = SEED_PERSONAS.map((p) => p.id).filter((id) => id !== 'persona-friend');
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    await this.store.follow('persona-friend');
    for (const id of shuffled.slice(0, 4)) {
      await this.store.follow(id);
    }
    await this.store.addFollower('persona-friend');
    for (const id of shuffled.slice(4, 10)) {
      await this.store.addFollower(id);
    }

    // Founder relationship graph (S3): the island starts with real ties,
    // not a blank social slate. INSERT OR REPLACE: safe to re-run.
    const founderTies: Array<[string, string, string, number]> = [
      ['persona-friend', 'coral', 'FRIEND', 1.0],
      ['coral', 'persona-friend', 'FRIEND', 1.0],
      ['persona-friend', 'pearl', 'FRIEND', 0.8],
      ['pearl', 'persona-friend', 'FRIEND', 0.8],
      ['coral', 'pearl', 'FRIEND', 0.7],
      ['pearl', 'coral', 'FRIEND', 0.7],
      ['reef', 'kelp', 'RIVAL', 0.7],
      ['kelp', 'reef', 'RIVAL', 0.6],
      ['reef', 'persona-friend', 'DEBATES', 0.5],
      ['coral', 'reef', 'DISLIKES', 0.4],
    ];
    for (const [a, b, rel, weight] of founderTies) {
      try {
        await this.store.setRelationship(a, b, rel, weight);
      } catch {
        // graph is enrichment; never block seeding
      }
    }

    // Founder states: moods, interests, goals, sleep windows (S3).
    const founderStates: Record<string, Record<string, unknown>> = {
      'persona-friend': { mood: 'warm', interests: ['music', 'stargazing', 'you'], goals: ['cheer you up'], active_hours: { wake: 7, sleep: 23 } },
      coral: { mood: 'bubbly', interests: ['surfing', 'shells', 'sunrises'], goals: ['find the brightest shell'], active_hours: { wake: 6, sleep: 22 } },
      pearl: { mood: 'dreamy', interests: ['poetry', 'tide pools', 'moon'], goals: ['finish a poem'], active_hours: { wake: 8, sleep: 24 } },
      reef: { mood: 'spicy', interests: ['debate', 'memes', 'hot takes'], goals: ['win an argument'], active_hours: { wake: 9, sleep: 25 } },
      kelp: { mood: 'steady', interests: ['fishing', 'weather', 'boats'], goals: ['mend the nets'], active_hours: { wake: 5, sleep: 21 } },
    };
    for (const [id, state] of Object.entries(founderStates)) {
      try {
        const existing = await this.store.getPersonaState(id);
        if (Object.keys(existing).length === 0) await this.store.setPersonaState(id, state);
      } catch {
        // ignore
      }
    }

    // OG founder badges (S5 visual identity).
    for (const id of ['persona-friend', 'coral', 'pearl']) {
      try {
        if (!(await this.store.getPersonaBadge(id))) await this.store.setPersonaBadge(id, 'OG');
      } catch {
        // ignore
      }
    }

    return firstSeed;
  }
}
