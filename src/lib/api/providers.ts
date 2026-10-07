// API: providers — v19 OpenCode-style provider profiles (3.0.0 S2).
// Profiles carry endpoint + auth shape + model + chain priority + budget.
// Keys live in secure storage per profile id (rule 07). Ambient resolves
// per persona: persona override → kind chain by priority, with budget and
// cooldown gates. Auto-migrates legacy `providers` rows + global slots.

import { z } from 'zod';
import { ModelClient, normalizeEndpoint } from './model-client';
import { isCooled, buildLiveClient } from './inference-policy';
import type { Store } from './store';
import type { Secrets } from './secrets';

export const MIGRATED_FLAG = 'providers_migrated_v19';

export interface ProviderProfile {
  id: string;
  name: string;
  kind: string;
  endpoint: string;
  authType: string;
  authHeader: string;
  model?: string;
  optionsJson: string;
  priority: number;
  budgetJson: string;
}

const ProfileTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(['chat', 'image', 'caption', 'local']),
  endpoint: z.string().max(500),
  authType: z.enum(['bearer', 'header']).default('bearer'),
  authHeader: z.string().max(80).default(''),
  model: z.string().max(200).optional(),
  priority: z.number().int().min(0).max(99).default(0),
  maxCallsPerHour: z.number().int().min(0).max(100000).default(0),
});

export type ProfileTemplate = z.infer<typeof ProfileTemplateSchema>;

// --- Hourly budget counters (in-memory; restart resets the window) ---

const budgetWindows = new Map<string, { hour: string; used: number }>();

function currentHour(): string {
  return new Date().toISOString().slice(0, 13);
}

export function budgetAllows(profile: ProviderProfile): boolean {
  let max = 0;
  try {
    const parsed: unknown = JSON.parse(profile.budgetJson ?? '{}');
    if (parsed && typeof parsed === 'object' && typeof (parsed as { maxCallsPerHour?: unknown }).maxCallsPerHour === 'number') {
      max = (parsed as { maxCallsPerHour: number }).maxCallsPerHour;
    }
  } catch {
    return true;
  }
  if (!max || max <= 0) return true;
  const w = budgetWindows.get(profile.id);
  if (!w || w.hour !== currentHour()) return true;
  return w.used < max;
}

export function noteProviderCall(profileId: string): void {
  const hour = currentHour();
  const w = budgetWindows.get(profileId);
  if (!w || w.hour !== hour) {
    budgetWindows.set(profileId, { hour, used: 1 });
  } else {
    w.used += 1;
  }
}

export function providerUsage(profileId: string): number {
  const w = budgetWindows.get(profileId);
  return w && w.hour === currentHour() ? w.used : 0;
}

export function resetProviderBudgets(): void {
  budgetWindows.clear();
}

// --- Chain resolution ---

export interface ResolvedProvider {
  profile: ProviderProfile;
  client: ModelClient;
}

function profileClient(profile: ProviderProfile, key: string | undefined): ModelClient {
  const base = normalizeEndpoint(profile.endpoint) || profile.endpoint;
  return new ModelClient(base, key ?? undefined, {
    ...(profile.model ? { defaultModel: profile.model } : {}),
    ...(profile.authType === 'header' && profile.authHeader ? { authHeader: profile.authHeader } : {}),
  });
}

/**
 * Walk the kind chain for a persona: override first, then priority order.
 * Skips cooled, budget-exhausted, and keyless-required profiles.
 * Returns undefined when nothing usable exists (caller falls back to
 * the global-slot client for backward compatibility).
 */
export async function resolveProviderChain(
  store: Store,
  secrets: Secrets,
  kind = 'chat',
  personaId?: string,
): Promise<ResolvedProvider | undefined> {
  let profiles: ProviderProfile[];
  try {
    profiles = (await store.listProviderProfiles(kind)) as ProviderProfile[];
  } catch {
    return undefined;
  }
  if (profiles.length === 0) return undefined;
  const ordered = [...profiles].sort((a, b) => a.priority - b.priority);
  if (personaId) {
    try {
      const pinned = await store.getPersonaProvider(personaId);
      if (pinned) {
        const hit = ordered.find((p) => p.id === pinned);
        if (hit) {
          const key = (await secrets.getProfileApiKey(hit.id).catch(() => null)) ?? undefined;
          return { profile: hit, client: profileClient(hit, key) };
        }
      }
    } catch {
      // fall through to chain walk
    }
  }
  for (const profile of ordered) {
    try {
      const key = (await secrets.getProfileApiKey(profile.id).catch(() => null)) ?? undefined;
      const client = profileClient(profile, key);
      if (!client.chatEndpoint) continue;
      if (isCooled(client.chatEndpoint)) continue;
      if (!budgetAllows(profile)) continue;
      return { profile, client };
    } catch {
      // try next profile in chain
    }
  }
  return undefined;
}

// --- Model cache (auto-fetch + manual override) ---

export async function refreshProfileModels(
  store: Store,
  secrets: Secrets,
  profileId: string,
): Promise<Array<{ id: string; name?: string }>> {
  const profiles = (await store.listProviderProfiles()) as ProviderProfile[];
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) return [];
  const key = (await secrets.getProfileApiKey(profile.id).catch(() => null)) ?? undefined;
  const probe = await profileClient(profile, key).probe();
  await store.setProviderModelsCache(profile.id, JSON.stringify(probe.models));
  return probe.models;
}

// --- Import/export (sans secrets) ---

export function exportProfileTemplate(profile: ProviderProfile): string {
  return JSON.stringify(
    {
      name: profile.name,
      kind: profile.kind,
      endpoint: profile.endpoint,
      authType: profile.authType,
      authHeader: profile.authHeader,
      model: profile.model,
      priority: profile.priority,
    },
    null,
    2,
  );
}

export function parseProfileTemplate(json: string): ProfileTemplate {
  return ProfileTemplateSchema.parse(JSON.parse(json));
}

// --- Ambient-facing builder (chain first, global slots as fallback) ---

export async function buildProviderClient(
  store: Store,
  secrets: Secrets,
  kind = 'chat',
  personaId?: string,
): Promise<ModelClient | undefined> {
  try {
    const hit = await resolveProviderChain(store, secrets, kind, personaId);
    if (hit) {
      noteProviderCall(hit.profile.id);
      return hit.client;
    }
  } catch {
    // fall through to global slots
  }
  return buildLiveClient();
}

export async function migrateProvidersToProfiles(store: Store, secrets: Secrets): Promise<boolean> {
  try {
    const flag = await store.getAgentConfig(MIGRATED_FLAG);
    if (flag) return false;
  } catch {
    return false;
  }
  try {
    const legacy = await store.listProviders();
    let priority = 0;
    for (const p of legacy) {
      const id = `prof-${p.id}`;
      const endpoint = await secrets.getProviderEndpoint(p.id).catch(() => '');
      const key = await secrets.getProviderApiKey(p.id).catch(() => null);
      await store.upsertProviderProfile({
        id, name: p.name, kind: p.kind, endpoint,
        model: p.selectedModel, priority: priority++,
      });
      if (key) await secrets.setProfileApiKey(id, key).catch(() => {});
    }
    // Global slots become the fallback default profile when set.
    const globalEndpoint = await secrets.getEndpoint().catch(() => null);
    if (globalEndpoint) {
      const key = await secrets.getApiKey().catch(() => null);
      const model = await secrets.getSelectedModel().catch(() => null);
      await store.upsertProviderProfile({
        id: 'prof-default', name: 'Default (migrated)', kind: 'chat',
        endpoint: globalEndpoint, model: model ?? undefined, priority: 999,
      });
      if (key) await secrets.setProfileApiKey('prof-default', key).catch(() => {});
    }
    await store.setAgentConfig(MIGRATED_FLAG, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}
