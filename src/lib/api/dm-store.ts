// API: dm-store — DM + thread use-cases (Sprint 6).
// Zod-validated inputs, all SQL here or in store/.

import type { Store } from './store';

interface DmRow {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  imagePath: string | null;
  replyToId?: string;
  createdAt: string;
  origin: 'glimmer' | 'offline';
}

export interface Dm {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  imagePath?: string;
  replyToId?: string;
  createdAt: string;
  origin: 'glimmer' | 'offline';
}

export interface ThreadInboxItem {
  threadId: string;
  otherPersona: {
    id: string;
    displayName: string;
    affinity: number;
  };
  lastDm: Dm;
  unread: boolean;
}

export interface PersonaRow {
  id: string;
  displayName: string;
  affinity: number;
}

export class DmStore {
  constructor(private store: Store) {}

  async getThread(threadId: string): Promise<Dm[]> {
    const rows = await this.store.query<DmRow>(
      `SELECT id, thread_id AS threadId, sender_id AS senderId, body, image_path AS imagePath,
              reply_to_id AS replyToId, created_at AS createdAt, origin
       FROM dms
       WHERE thread_id = ?
       ORDER BY created_at ASC`,
      [threadId],
    );
    return rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      senderId: r.senderId,
      body: r.body,
      imagePath: r.imagePath || undefined,
      replyToId: r.replyToId || undefined,
      createdAt: r.createdAt,
      origin: r.origin,
    }));
  }

  async sendMessage(threadId: string, senderId: string, body: string, replyToId?: string): Promise<Dm> {
    const id = `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const createdAt = new Date().toISOString();
    await this.store.createDm({
      id,
      threadId,
      senderId,
      body,
      replyToId,
      createdAt,
      origin: 'glimmer',
    });
    return {
      id,
      threadId,
      senderId,
      body,
      replyToId,
      createdAt,
      origin: 'glimmer',
    };
  }

  async markRead(threadId: string, _userId: string): Promise<void> {
    await this.store.markDmRead(threadId);
  }

  async listInbox(_userId: string): Promise<ThreadInboxItem[]> {
    const allDms = await this.store.query<DmRow>(
      `SELECT id, thread_id AS threadId, sender_id AS senderId, body, image_path AS imagePath,
              reply_to_id AS replyToId, created_at AS createdAt, origin
       FROM dms`,
    );
    const userDms = allDms.filter((d) => d.threadId.startsWith('user:'));

    const latestByThread = new Map<string, DmRow>();
    for (const dm of userDms) {
      const existing = latestByThread.get(dm.threadId);
      if (!existing || dm.createdAt > existing.createdAt) {
        latestByThread.set(dm.threadId, dm);
      }
    }

    const personas = await this.store.query<{ id: string; displayName: string; affinity: number }>(
      `SELECT id, display_name AS displayName, affinity FROM personas`,
    );
    const personaMap = new Map(personas.map((p) => [p.id, p]));

    const dmReads = await this.store.query<{ threadId: string; lastReadAt: string }>(
      `SELECT thread_id AS threadId, last_read_at AS lastReadAt FROM dm_reads`,
    );
    const readMap = new Map(dmReads.map((r) => [r.threadId, r.lastReadAt]));

    const result: ThreadInboxItem[] = [];
    for (const [threadId, lastDm] of latestByThread) {
      // Thread ids are `user:<personaId>`; be liberal (ids may contain ':').
      const personaId = threadId.startsWith('user:')
        ? threadId.slice('user:'.length)
        : threadId;
      const persona = personaMap.get(personaId);
      // Never drop a thread: fall back to the raw id when the persona row
      // is missing (e.g. removed or spawned personas).
      const displayName = persona?.displayName ?? personaId;
      const affinity = persona?.affinity ?? 0.5;

      const lastReadAt = readMap.get(threadId);
      result.push({
        threadId,
        otherPersona: {
          id: personaId,
          displayName,
          affinity,
        },
        lastDm: {
          id: lastDm.id,
          threadId: lastDm.threadId,
          senderId: lastDm.senderId,
          body: lastDm.body,
          imagePath: lastDm.imagePath || undefined,
          createdAt: lastDm.createdAt,
          origin: lastDm.origin,
        },
        unread: !lastReadAt || lastDm.createdAt > lastReadAt,
      });
    }

    result.sort((a, b) => b.lastDm.createdAt.localeCompare(a.lastDm.createdAt));

    return result;
  }

  async getPersona(personaId: string): Promise<PersonaRow | undefined> {
    const row = await this.store.selectOne<{ id: string; displayName: string; affinity: number }>(
      `SELECT id, display_name AS displayName, affinity FROM personas WHERE id = ?`,
      [personaId],
    );
    if (!row) return undefined;
    return {
      id: row.id,
      displayName: row.displayName,
      affinity: row.affinity,
    };
  }

  async searchDms(query: string): Promise<Array<{ id: string; threadId: string; senderId: string; body: string; createdAt: string }>> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const escaped = q.replace(/[%_]/g, '\\$&');
    const rows = await this.store.query<any>(
      `SELECT id, thread_id AS threadId, sender_id AS senderId, body, created_at AS createdAt
       FROM dms
       WHERE lower(body) LIKE ?
       ORDER BY created_at DESC`,
      [`%${escaped}%`],
    );
    return rows.map((r) => ({
      id: r.id,
      threadId: r.threadId,
      senderId: r.senderId,
      body: r.body,
      createdAt: r.createdAt,
    }));
  }
}
