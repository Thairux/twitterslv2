// Lib: launch — first-run + resume orchestration (Sprint 2).
// Opens DB, runs migrations, seeds personas if empty. Called from App.tsx on mount.

import { openDatabase } from '../native/db';
import { SEED_PERSONAS } from '../store/seeds';
import type { DbAdapter } from '../native/db';

export interface BootResult {
  db: DbAdapter;
  seeded: boolean;
}

export async function boot(): Promise<BootResult> {
  const db = await openDatabase('twittersl');

  let seeded = false;
  try {
    const rows = await db.query<{ id: string }>('SELECT id FROM personas LIMIT 1');
    if (rows.length === 0) {
      await db.transaction(async (tx) => {
        const now = new Date().toISOString();
        for (const p of SEED_PERSONAS) {
          await tx.execute(
            `INSERT INTO personas (id, handle, display_name, role, vibe, bio, avatar_seed, affinity, active, spawned_week, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id,
              p.handle,
              p.display_name,
              p.role,
              p.vibe,
              p.bio,
              p.avatar_seed,
              p.affinity,
              p.active,
              p.spawned_week,
              now,
            ],
          );
        }
      });
      seeded = true;
    }
  } catch (err) {
    console.error('[launch] seed check failed:', err);
  }

  return { db, seeded };
}
