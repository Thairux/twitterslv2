import { Store } from './api/store';
import { ModelClient } from './api/model-client';
import { resolveAmbientClient } from './api/activity';
import { noteAmbientFallback, noteAmbientLive } from './api/ambient-status';
import { nextSpawnWeek, spawnWeek } from './domain/world';

export async function onResumeTick(store: Store, modelClient?: ModelClient): Promise<void> {
  await friendPing(store, 'persona-friend', modelClient);
  await weeklySpawn(store);
}

export async function friendPing(store: Store, personaId: string, modelClient?: ModelClient): Promise<void> {
  const persona = await store.getPersona(personaId);
  if (!persona) return;
  const threadId = `user:${personaId}`;
  // Never trust the passed (usually boot-time) client: re-resolve from
  // storage so a freshly saved endpoint/key/model takes effect immediately.
  // With no endpoint configured at all there is nothing live to call.
  const live = await resolveAmbientClient(modelClient);
  let body: string;
  let origin: 'glimmer' | 'offline' = 'offline';
  if (live) {
    try {
      const prompt = `Send a short check-in DM to the user as ${persona.displayName}. Friendly, under 60 chars.`;
      body = await live.chat([{ role: 'user', content: prompt }]);
      origin = 'glimmer';
      noteAmbientLive();
    } catch (err) {
      noteAmbientFallback('friendPing', err);
      body = 'hey, just checking in!';
    }
  } else {
    body = 'hey, just checking in!';
  }
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
}
