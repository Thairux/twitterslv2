import { Store } from './store';
import { SEED_PERSONAS } from '../../store/seeds';

export class SeedService {
  constructor(private store: Store) {}

  async seedIfEmpty(): Promise<boolean> {
    const existing = await this.store.listPersonas();
    if (existing.length > 0) return false;

    for (const p of SEED_PERSONAS) {
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

    return true;
  }
}
