import { Store } from './api/store';
import { ModelClient } from './api/model-client';
import { noteAmbientLive } from './api/ambient-status';
import {
  getInferencePolicy,
  ambientLocalEnabled,
  reportAmbientFailure,
  tryAmbientLocal,
} from './api/inference-policy';
import { buildProviderClient } from './api/providers';
import { loadPersonaContexts } from './api/persona-context';
import type { Persona } from './domain/persona';
import type { Secrets } from './api/secrets';
import { makePost } from './domain/post';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES, OFFLINE_POST_STARTERS, REAL_PHOTO_URLS, REAL_LINK_POSTS } from './domain/engine';

async function routedClient(
  store: Store,
  secrets: Secrets | undefined,
  fallback: ModelClient | undefined,
  personaId: string,
): Promise<ModelClient | undefined> {
  if (!secrets) return fallback;
  try {
    return (await buildProviderClient(store, secrets, 'chat', personaId)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function ambientTick(store: Store, modelClient?: ModelClient, secrets?: Secrets): Promise<void> {
  const personas = (await store.listPersonas()).filter((p) => p.active);
  if (personas.length === 0) return;

  const count = 1 + Math.floor(Math.random() * 3);
  const chosen: Persona[] = [];
  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  const contexts = await loadPersonaContexts(store, personas.map((p) => p.id)).catch(
    () => new Map<string, { blurb: string; asleep: boolean }>(),
  );
  for (const p of shuffled) {
    if (chosen.length >= count) break;
    // Sleep windows gate ambient posts (DMs still flow — responsiveness wins).
    if (contexts.get(p.id)?.asleep) continue;
    chosen.push(p);
  }

  for (const persona of chosen) {
    const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
    let body: string | undefined;
    let origin: 'glimmer' | 'offline' = 'offline';
    const policy = await getInferencePolicy(store).catch(() => 'strict' as const);
    const useLocal = await ambientLocalEnabled(store).catch(() => false);
    const prompt = `You live on a tropical island social network. Write a short in-character post as ${persona.displayName} (${persona.role}): ${persona.vibe}.${contexts.get(persona.id)?.blurb ?? ''} Slice of island life, concrete details, under 140 chars, no hashtags.`;
    // One in four offline posts links a real verified article (unfurls as a
    // link card, X-style); one in three carries a real photo.
    if (!modelClient && Math.random() < 0.25) {
      const link = REAL_LINK_POSTS[Math.floor(Math.random() * REAL_LINK_POSTS.length)];
      body = `${link.body} ${link.url}`;
    } else if (modelClient && policy !== 'offline') {
      const routed = await routedClient(store, secrets, modelClient, persona.id);
      try {
        body = await (routed ?? modelClient).chat([{ role: 'user', content: prompt }]);
        origin = 'glimmer';
        noteAmbientLive();
        await modelClient.recordAttempt(store as any, undefined, 'chat');
      } catch (err) {
        reportAmbientFailure('chatter:post', err, routed ?? modelClient);
        if (useLocal) {
          const local = await tryAmbientLocal([{ role: 'user', content: prompt }]);
          if (local) {
            body = local.text;
            origin = 'glimmer';
          }
        }
        if (body === undefined && policy !== 'strict') {
          body = modelClient.offlineReply(pool);
        }
        // Strict with no local result: skip this persona (no pool fill).
      }
    } else if (!modelClient) {
      body = OFFLINE_POST_STARTERS[Math.floor(Math.random() * OFFLINE_POST_STARTERS.length)];
    } else {
      // Policy offline with a client: pools by explicit choice.
      body = modelClient.offlineReply(pool);
    }
    if (!body) continue;
    const imageUrl = Math.random() < 0.3
      ? REAL_PHOTO_URLS[Math.floor(Math.random() * REAL_PHOTO_URLS.length)]
      : undefined;
    const post = makePost(persona.id, body, { origin, aiGenerated: origin === 'glimmer', imageUrl });
    store.createPost(post);
  }
}

export async function personaToPersonaDms(store: Store, modelClient?: ModelClient, secrets?: Secrets): Promise<void> {
  const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
  if (personas.length < 2) return;

  const shuffled = [...personas].sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const b = shuffled[1];
  const threadId = `agent:${[a.id, b.id].sort().join(':')}`;
  let relVoice = '';
  try {
    const rels = await store.listRelationships();
    const hit = rels.find((r) => (r.aId === a.id && r.bId === b.id) || (r.aId === b.id && r.bId === a.id));
    if (hit) relVoice = ` (you two are ${hit.rel.toLowerCase()}s)`;
  } catch {
    // stateless fallback
  }

  let textA: string | undefined;
  let textB: string | undefined;
  // Honest origin: persona-to-persona DMs used to hardcode 'offline' even
  // when the endpoint answered, hiding live success from the UI.
  let origin: 'glimmer' | 'offline' = 'offline';
  const policy = await getInferencePolicy(store).catch(() => 'strict' as const);
  if (modelClient && policy !== 'offline') {
    const routedA = await routedClient(store, secrets, modelClient, a.id);
    const routedB = await routedClient(store, secrets, modelClient, b.id);
    try {
      textA = await (routedA ?? modelClient).chat([{ role: 'user', content: `DM as ${a.displayName} to ${b.displayName}${relVoice}: say hello briefly.` }]);
      textB = await (routedB ?? modelClient).chat([{ role: 'user', content: `DM as ${b.displayName} replying to ${a.displayName}${relVoice}: respond briefly.` }]);
      origin = 'glimmer';
      noteAmbientLive();
      await modelClient.recordAttempt(store as any, undefined, 'dm');
    } catch (err) {
      reportAmbientFailure('chatter:p2p-dm', err, routedA ?? modelClient);
      if (await ambientLocalEnabled(store).catch(() => false)) {
        const first = await tryAmbientLocal([{ role: 'user', content: `DM as ${a.displayName} to ${b.displayName}: say hello briefly.` }]);
        const second = first
          ? await tryAmbientLocal([{ role: 'user', content: `DM as ${b.displayName} replying to ${a.displayName}: respond briefly.` }])
          : undefined;
        if (first?.text && second?.text) {
          textA = first.text;
          textB = second.text;
          origin = 'glimmer';
        }
      }
      if ((textA === undefined || textB === undefined) && policy !== 'strict') {
        textA = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
        textB = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
      }
      // Strict with no local result: no island DMs (no pool fill).
    }
  } else if (!modelClient) {
    textA = OFFLINE_CROWD_REPLIES[Math.floor(Math.random() * OFFLINE_CROWD_REPLIES.length)];
    textB = OFFLINE_CROWD_REPLIES[Math.floor(Math.random() * OFFLINE_CROWD_REPLIES.length)];
  } else {
    // Policy offline with a client: pools by explicit choice.
    textA = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
    textB = modelClient.offlineReply(OFFLINE_CROWD_REPLIES);
  }

  // Strict with no live/local result: skip both DMs (no pool fill).
  if (textA === undefined || textB === undefined) return;

  const now = new Date().toISOString();
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: a.id,
    body: textA,
    createdAt: now,
    origin,
  });
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: b.id,
    body: textB,
    createdAt: now,
    origin,
  });
}
