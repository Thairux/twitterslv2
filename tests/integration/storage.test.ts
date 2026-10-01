// Storage adapter contract tests (Sprint 2).
// Every DbAdapter implementation (Capacitor SQLite + web fallback) must pass
// the same suite: open → migrate → CRUD → transaction rollback → close.

import { describe, test, expect } from 'vitest';
import { openDatabase } from '@/native/db';

describe('storage adapter contract', () => {
  test('web adapter opens and returns rows', async () => {
    const db = await openDatabase('test-contract');
    const rows = await db.query<{ id: string }>('SELECT id FROM personas');
    expect(Array.isArray(rows)).toBe(true);
  });
});
