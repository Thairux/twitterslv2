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

    return firstSeed;
  }
}
