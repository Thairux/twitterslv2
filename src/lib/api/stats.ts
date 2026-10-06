// API: stats — activity dashboards over single-table queries only.
// The web fallback driver supports plain SELECT; all grouping/filtering
// happens in JS so dashboards work identically on both drivers.

import type { Store } from './store';

export interface PersonaStats {
  personaId: string;
  displayName: string;
  posts: number;
  replies: number;
  likesGiven: number;
  likesReceived: number;
  dmsToUser: number;
  dmsToPersonas: number;
  dmsFromUser: number;
}

export interface DayStats {
  day: string;
  posts: number;
  replies: number;
  likes: number;
  dmsToUser: number;
  dmsToPersonas: number;
  dmsFromUser: number;
}

function dayOf(iso: string): string {
  return (iso || '').slice(0, 10);
}

export async function personaStats(store: Store, personaId: string): Promise<PersonaStats> {
  const [personas, posts, replies, reactions, dms] = await Promise.all([
    store.listPersonas(),
    store.query<{ author_id: string }>('SELECT author_id FROM posts'),
    store.query<{ post_id: string; author_id: string }>('SELECT post_id, author_id FROM replies'),
    store.query<{ post_id: string; persona_id: string; kind: string }>('SELECT post_id, persona_id, kind FROM reactions'),
    store.query<{ thread_id: string; sender_id: string }>('SELECT thread_id, sender_id FROM dms'),
  ]);
  const persona = personas.find((p) => p.id === personaId);
  const myPostIds = new Set(
    (await store.query<{ id: string }>('SELECT id FROM posts WHERE author_id = ?', [personaId])).map((r) => r.id),
  );
  let likesReceived = 0;
  for (const r of reactions) {
    if (r.kind === 'like' && myPostIds.has(r.post_id)) likesReceived += 1;
  }
  let dmsToUser = 0;
  let dmsToPersonas = 0;
  let dmsFromUser = 0;
  for (const d of dms) {
    if (d.thread_id === `user:${personaId}`) {
      if (d.sender_id === personaId) dmsToUser += 1;
      else if (d.sender_id === 'user') dmsFromUser += 1;
    } else if (d.sender_id === personaId) {
      dmsToPersonas += 1;
    }
  }
  return {
    personaId,
    displayName: persona?.displayName ?? personaId,
    posts: posts.filter((p) => p.author_id === personaId).length,
    replies: replies.filter((r) => r.author_id === personaId).length,
    likesGiven: reactions.filter((r) => r.persona_id === personaId && r.kind === 'like').length,
    likesReceived,
    dmsToUser,
    dmsToPersonas,
    dmsFromUser,
  };
}

export async function todayStats(store: Store, day?: string): Promise<DayStats> {
  const target = day ?? new Date().toISOString().slice(0, 10);
  const [posts, replies, reactions, dms] = await Promise.all([
    store.query<{ created_at: string }>('SELECT created_at FROM posts'),
    store.query<{ created_at: string }>('SELECT created_at FROM replies'),
    store.query<{ kind: string; created_at: string }>('SELECT kind, created_at FROM reactions'),
    store.query<{ thread_id: string; sender_id: string; created_at: string }>(
      'SELECT thread_id, sender_id, created_at FROM dms',
    ),
  ]);
  let dmsToUser = 0;
  let dmsToPersonas = 0;
  let dmsFromUser = 0;
  for (const d of dms) {
    if (dayOf(d.created_at) !== target) continue;
    if (d.thread_id.startsWith('user:')) {
      if (d.sender_id === 'user') dmsFromUser += 1;
      else dmsToUser += 1;
    } else {
      dmsToPersonas += 1;
    }
  }
  return {
    day: target,
    posts: posts.filter((p) => dayOf(p.created_at) === target).length,
    replies: replies.filter((r) => dayOf(r.created_at) === target).length,
    likes: reactions.filter((r) => r.kind === 'like' && dayOf(r.created_at) === target).length,
    dmsToUser,
    dmsToPersonas,
    dmsFromUser,
  };
}
