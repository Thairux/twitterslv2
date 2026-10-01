import { Store } from './api/store';
import { ModelClient } from './api/model-client';
import { nextSpawnWeek, spawnWeek } from './domain/world';

export async function onResumeTick(store: Store, modelClient: ModelClient): Promise<void> {
  await friendPing(store, 'persona-friend', modelClient);
  await weeklySpawn(store);
}

export async function friendPing(store: Store, personaId: string, modelClient: ModelClient): Promise<void> {
  const persona = await store.getPersona(personaId);
  if (!persona) return;
  const threadId = `user:${personaId}`;
  let body: string;
  try {
    const prompt = `Send a short check-in DM to the user as ${persona.displayName}. Friendly, under 60 chars.`;
    body = await modelClient.chat([{ role: 'user', content: prompt }]);
  } catch {
    body = 'hey, just checking in!';
  }
  const now = new Date().toISOString();
  store.createDm({
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    threadId,
    senderId: personaId,
    body,
    createdAt: now,
    origin: 'offline',
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
