// TwitterSL v2 — migration runner (Sprint 2).
// Applies MIGRATIONS in order inside transactions; records version in storage.
// Works on both @capacitor-community/sqlite (native) and the web fallback
// via the src/native/db adapter — never import Capacitor here.

import { MIGRATIONS, SCHEMA_VERSION } from './migration-defs';
import type { DbAdapter } from '../native/db';

export async function migrate(db: DbAdapter): Promise<void> {
  const rows = await db.query<{ user_version: number }>('PRAGMA user_version');
  const current = rows[0]?.user_version ?? 0;

  if (current >= SCHEMA_VERSION) return;

  const pending = MIGRATIONS.filter((m) => m.version > current && m.sql.length > 0);
  if (pending.length === 0) {
    await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    return;
  }

  await db.transaction(async (tx) => {
    for (const migration of pending) {
      for (const sql of migration.sql) {
        if (!sql.trim()) continue;
        await tx.execute(sql);
      }
    }
  });

  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}
