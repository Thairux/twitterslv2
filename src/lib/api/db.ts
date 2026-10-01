import type { DbAdapter, Transaction } from '../../native/db';

export class Database {
  constructor(private db: DbAdapter) {}

  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.query<T>(sql, params);
  }

  async selectOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.db.query<T>(sql, params);
    return rows[0] ?? null;
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.db.execute(sql, params);
  }

  async transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    const pending: { sql: string; params: unknown[] }[] = [];
    const tx: Transaction = {
      execute: async (sql: string, p: unknown[] = []) => {
        pending.push({ sql, params: p });
      },
    };
    let result: T;
    try {
      result = await fn(tx);
    } catch (err) {
      throw err;
    }
    if (pending.length > 0) {
      await this.db.transaction(async (innerTx) => {
        for (const { sql, params } of pending) {
          await innerTx.execute(sql, params);
        }
      });
    }
    return result;
  }
}
