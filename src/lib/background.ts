import { Store } from './api/store';
import type { Secrets } from './api/secrets';
import { ModelClient } from './api/model-client';
import { resolveAmbientClient, chainResolver } from './api/activity';
import { noteAmbientLive } from './api/ambient-status';
import {
  getInferencePolicy,
  ambientLocalEnabled,
  reportAmbientFailure,
  tryAmbientLocal,
} from './api/inference-policy';
import { loadPersonaContexts } from './api/persona-context';
import { nextSpawnWeek, spawnWeek } from './domain/world';

export async function onResumeTick(store: Store, modelClient?: ModelClient, secrets?: Secrets): Promise<void> {
  await friendPing(store, 'persona-friend', modelClient, secrets);
  await weeklySpawn(store);
}

export async function friendPing(store: Store, personaId: string, modelClient?: ModelClient, secrets?: Secrets): Promise<void> {
  const persona = await store.getPersona(personaId);
  if (!persona) return;
  const threadId = `user:${personaId}`;
  // Never trust the passed (usually boot-time) client: re-resolve from
  // storage so a freshly saved endpoint/key/model takes effect immediately.
  // With no endpoint configured at all there is nothing live to call.
  // Policy offline forces pools; Strict skips pool-fill on live failure.
  const policy = await getInferencePolicy(store).catch(() => 'strict' as const);
  const chain = chainResolver(store, secrets, personaId);
  const live = policy === 'offline' ? undefined : await resolveAmbientClient(modelClient, chain);
  let body: string | undefined;
  let origin: 'glimmer' | 'offline' = 'offline';
  if (live) {
    const ctx = await loadPersonaContexts(store, [personaId]).catch(
      () => new Map<string, { blurb: string; asleep: boolean }>(),
    );
    const blurb = ctx.get(personaId)?.blurb ?? '';
    const prompt = `Send a short check-in DM to the user as ${persona.displayName}.${blurb} Friendly, under 60 chars.`;
    try {
      body = await live.chat([{ role: 'user', content: prompt }]);
      origin = 'glimmer';
      noteAmbientLive();
    } catch (err) {
      reportAmbientFailure('friendPing', err, live);
      if (await ambientLocalEnabled(store).catch(() => false)) {
        const local = await tryAmbientLocal([{ role: 'user', content: prompt }]);
        if (local) {
          body = local.text;
          origin = 'glimmer';
        }
      }
      if (body === undefined && policy !== 'strict') {
        body = 'hey, just checking in!';
      }
    }
  } else {
    body = 'hey, just checking in!';
  }
  if (body === undefined) return;
  const now = new Date().toISOString();
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: personaId,
    body,
    createdAt: now,
    origin,
  });
}

export async function weeklySpawn(store: Store): Promise<void> {
  const state = await store.getSpawnState();
  if (!state) return;
  const nextWeek = nextSpawnWeek(state.currentWeek, state.totalSpawned);
  if (nextWeek === null) return;
  const spawns = spawnWeek(state, nextWeek);
  for (const s of spawns) {
    store.upsertPersona(s.persona as any);
  }
  store.advanceWeek(nextWeek);
  // Arrival ceremony: each newcomer announces themselves and says hello,
  // so the island notices arrivals (feed + Gazette + inbox).
  for (const s of spawns) {
    const p = s.persona as any;
    try {
      await store.createPost({
        id: `p-arr-${Date.now()}-${p.id}`,
        authorId: p.id,
        body: `just washed ashore — hi everyone, I'm ${p.displayName ?? p.id}! ${String(p.bio ?? '').slice(0, 80)}`.slice(0, 280),
        createdAt: new Date().toISOString(),
        likes: 0,
        reposts: 0,
        origin: 'offline',
        edited: false,
        aiGenerated: false,
      });
    } catch {
      // ignore
    }
    try {
      await store.createDm({
        id: `dm_arr_${Date.now()}_${p.id}`,
        threadId: `user:${p.id}`,
        senderId: p.id,
        body: `hi! I just arrived on the island — ${String(p.vibe ?? 'excited to meet you').slice(0, 100)}`,
        createdAt: new Date().toISOString(),
        origin: 'offline',
      });
    } catch {
      // ignore
    }
  }
}
