import { Store } from './api/store';
import { ModelClient } from './api/model-client';
import type { Persona } from './domain/persona';
import { makePost } from './domain/post';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES, OFFLINE_POST_STARTERS, REAL_PHOTO_URLS, REAL_LINK_POSTS } from './domain/engine';

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
    // One in four offline posts links a real verified article (unfurls as a
    // link card, X-style); one in three carries a real photo.
    if (!modelClient && Math.random() < 0.25) {
      const link = REAL_LINK_POSTS[Math.floor(Math.random() * REAL_LINK_POSTS.length)];
      body = `${link.body} ${link.url}`;
    } else if (modelClient) {
      try {
        const prompt = `You live on a tropical island social network. Write a short in-character post as ${persona.displayName} (${persona.role}): ${persona.vibe}. Slice of island life, concrete details, under 140 chars, no hashtags.`;
        body = await modelClient.chat([{ role: 'user', content: prompt }]);
        origin = 'glimmer';
        await modelClient.recordAttempt(store as any, undefined, 'chat');
      } catch {
        body = modelClient.offlineReply(pool);
      }
    } else {
      body = OFFLINE_POST_STARTERS[Math.floor(Math.random() * OFFLINE_POST_STARTERS.length)];
    }
    if (!body) continue;
    const imageUrl = Math.random() < 0.3
      ? REAL_PHOTO_URLS[Math.floor(Math.random() * REAL_PHOTO_URLS.length)]
      : undefined;
    const post = makePost(persona.id, body, { origin, aiGenerated: origin === 'glimmer', imageUrl });
    store.createPost(post);
  }
}

export async function personaToPersonaDms(store: Store, modelClient?: ModelClient): Promise<void> {
  const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
  if (personas.length < 2) return;

  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const b = shuffled[1];
  const threadId = `agent:${[a.id, b.id].sort().join(':')}`;

  let textA: string;
  let textB: string;
  if (modelClient) {
    try {
      textA = await modelClient.chat([{ role: 'user', content: `DM as ${a.displayName} to ${b.displayName}: say hello briefly.` }]);
      textB = await modelClient.chat([{ role: 'user', content: `DM as ${b.displayName} replying to ${a.displayName}: respond briefly.` }]);
      await modelClient.recordAttempt(store as any, undefined, 'dm');
    } catch {
      textA = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
      textB = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
    }
  } else {
    textA = OFFLINE_CROWD_REPLIES[Math.floor(Math.random() * OFFLINE_CROWD_REPLIES.length)];
    textB = OFFLINE_CROWD_REPLIES[Math.floor(Math.random() * OFFLINE_CROWD_REPLIES.length)];
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
