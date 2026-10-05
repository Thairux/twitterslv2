import { Store } from './api/store';
import { ModelClient } from './api/model-client';
import type { Persona } from './domain/persona';
import { makePost } from './domain/post';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES } from './domain/engine';

export async function ambientTick(store: Store, modelClient?: ModelClient): Promise<void> {
  const personas = (await store.listPersonas()).filter((p) => p.active);
  if (personas.length === 0) return;

  const count = 1 + Math.floor(Math.random() * 3);
  const chosen: Persona[] = [];
  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  for (const p of shuffled) {
    if (chosen.length >= count) break;
    chosen.push(p);
  }

  for (const persona of chosen) {
    const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
    let body: string;
    let origin: 'glimmer' | 'offline' = 'offline';
    if (modelClient) {
      try {
        const prompt = `Write a short tweet as ${persona.displayName} (${persona.role}): ${persona.vibe}. Under 140 chars.`;
        body = await modelClient.chat([{ role: 'user', content: prompt }]);
        origin = 'glimmer';
        await modelClient.recordAttempt(store as any, undefined, 'chat');
      } catch {
        body = modelClient.offlineReply(pool);
      }
    } else {
      body = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!body) continue;
    const post = makePost(persona.id, body, { origin, aiGenerated: origin === 'glimmer' });
    store.createPost(post);
  }
}

export async function personaToPersonaDms(store: Store, modelClient: ModelClient): Promise<void> {
  const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
  if (personas.length < 2) return;

  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const b = shuffled[1];
  const threadId = `agent:${[a.id, b.id].sort().join(':')}`;

  let textA: string;
  let textB: string;
  try {
    textA = await modelClient.chat([{ role: 'user', content: `DM as ${a.displayName} to ${b.displayName}: say hello briefly.` }]);
    textB = await modelClient.chat([{ role: 'user', content: `DM as ${b.displayName} replying to ${a.displayName}: respond briefly.` }]);
    await modelClient.recordAttempt(store as any, undefined, 'dm');
  } catch {
    textA = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
    textB = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
  }

  const now = new Date().toISOString();
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: a.id,
    body: textA,
    createdAt: now,
    origin: 'offline',
  });
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: b.id,
    body: textB,
    createdAt: now,
    origin: 'offline',
  });
}
