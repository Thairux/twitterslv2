import { describe, it, expect, beforeEach } from 'vitest';
import { openDatabase } from '@/native/db';
import { Database } from '@/lib/api/db';
import { Store } from '@/lib/api/store';
import { Secrets } from '@/lib/api/secrets';
import {
  resolveProviderChain,
  buildProviderClient,
  migrateProvidersToProfiles,
  budgetAllows,
  noteProviderCall,
  providerUsage,
  resetProviderBudgets,
  parseProfileTemplate,
  exportProfileTemplate,
  refreshProfileModels,
} from '@/lib/api/providers';

function memSecrets(store: Map<string, string>) {
  return {
    async getProviderEndpoint() { return ''; },
    async getProviderApiKey() { return null; },
    async getEndpoint() { return null; },
    async getApiKey() { return null; },
    async getSelectedModel() { return null; },
    async getProfileApiKey(id: string) { return store.get(`key:${id}`) ?? null; },
    async setProfileApiKey(id: string, key: string) { store.set(`key:${id}`, key); },
  } as unknown as Secrets;
}

async function freshStore(name: string): Promise<Store> {
  return new Store(new Database(await openDatabase(name)));
}

beforeEach(() => {
  resetProviderBudgets();
});

describe('provider chain', () => {
  it('walks priority order and skips keyless-blocked profiles', async () => {
    const store = await freshStore('test-prov-chain');
    const secrets = memSecrets(new Map());
    await store.upsertProviderProfile({ id: 'p-slow', name: 'Slow', kind: 'chat', endpoint: 'https://slow.example', priority: 5 });
    await store.upsertProviderProfile({ id: 'p-fast', name: 'Fast', kind: 'chat', endpoint: 'https://fast.example', model: 'm1', priority: 0 });
    const hit = await resolveProviderChain(store, secrets, 'chat');
    expect(hit?.profile.id).toBe('p-fast');
    expect(hit?.client.chatEndpoint).toBe('https://fast.example');
    expect(hit?.client.defaultModel).toBe('m1');
  });

  it('honors per-persona routing override', async () => {
    const store = await freshStore('test-prov-route');
    const secrets = memSecrets(new Map());
    await store.upsertProviderProfile({ id: 'p-a', name: 'A', kind: 'chat', endpoint: 'https://a.example', priority: 0 });
    await store.upsertProviderProfile({ id: 'p-b', name: 'B', kind: 'chat', endpoint: 'https://b.example', priority: 1 });
    await store.setPersonaProvider('coral', 'p-b');
    const hit = await resolveProviderChain(store, secrets, 'chat', 'coral');
    expect(hit?.profile.id).toBe('p-b');
    const plain = await resolveProviderChain(store, secrets, 'chat');
    expect(plain?.profile.id).toBe('p-a');
  });

  it('returns undefined when no profiles exist', async () => {
    const store = await freshStore('test-prov-empty');
    const secrets = memSecrets(new Map());
    await expect(resolveProviderChain(store, secrets, 'chat')).resolves.toBeUndefined();
  });
});

describe('budgets', () => {
  it('stops the chain when the hourly budget is exhausted', async () => {
    const store = await freshStore('test-prov-budget');
    const secrets = memSecrets(new Map());
    await store.upsertProviderProfile({
      id: 'p-cap', name: 'Capped', kind: 'chat', endpoint: 'https://cap.example',
      priority: 0, budgetJson: JSON.stringify({ maxCallsPerHour: 1 }),
    });
    await store.upsertProviderProfile({ id: 'p-open', name: 'Open', kind: 'chat', endpoint: 'https://open.example', priority: 1 });
    const profiles = await store.listProviderProfiles('chat');
    expect(budgetAllows(profiles[0] as never)).toBe(true);
    noteProviderCall('p-cap');
    expect(providerUsage('p-cap')).toBe(1);
    expect(budgetAllows(profiles[0] as never)).toBe(false);
    const client = await buildProviderClient(store, secrets, 'chat');
    expect(client?.chatEndpoint).toBe('https://open.example');
  });
});

describe('migration', () => {
  it('converts legacy providers + global slots once', async () => {
    const store = await freshStore('test-prov-migrate');
    const backing = new Map<string, string>();
    const secrets = {
      ...memSecrets(backing),
      async getProviderEndpoint() { return 'https://legacy.example'; },
      async getProviderApiKey() { return 'legacy-key'; },
      async getEndpoint() { return 'https://global.example'; },
      async getApiKey() { return 'global-key'; },
      async getSelectedModel() { return 'gm'; },
    } as unknown as Secrets;
    await store.upsertProvider({ id: 'old1', name: 'Old', kind: 'chat', selectedModel: 'om' });
    expect(await migrateProvidersToProfiles(store, secrets)).toBe(true);
    expect(await migrateProvidersToProfiles(store, secrets)).toBe(false);
    const profiles = await store.listProviderProfiles();
    expect(profiles.length).toBe(2);
    expect(backing.get('key:prof-old1')).toBe('legacy-key');
    expect(backing.get('key:prof-default')).toBe('global-key');
  });
});

describe('import/export', () => {
  it('round-trips templates sans secrets and rejects bad JSON', () => {
    const tpl = parseProfileTemplate(JSON.stringify({
      name: 'Kilo', kind: 'chat', endpoint: 'https://api.kilo.ai/api/gateway',
      authType: 'bearer', model: 'm', priority: 0, maxCallsPerHour: 100,
    }));
    expect(tpl.name).toBe('Kilo');
    const out = exportProfileTemplate({ id: 'x', ...tpl, authHeader: '', optionsJson: '{}', budgetJson: '{}' } as never);
    expect(out).not.toContain('sk-');
    expect(() => parseProfileTemplate('nope')).toThrow();
    expect(() => parseProfileTemplate(JSON.stringify({ name: '', kind: 'nope' }))).toThrow();
  });
});

describe('model cache', () => {
  it('stores and reads cached model lists', async () => {
    const store = await freshStore('test-prov-cache');
    await store.upsertProviderProfile({ id: 'p-c', name: 'C', kind: 'chat', endpoint: 'https://c.example', priority: 0 });
    expect(await store.getProviderModelsCache('p-c')).toBeNull();
    await store.setProviderModelsCache('p-c', JSON.stringify([{ id: 'm1' }]));
    expect(await store.getProviderModelsCache('p-c')).toMatchObject({ modelsJson: JSON.stringify([{ id: 'm1' }]) });
    expect(refreshProfileModels).toBeTypeOf('function');
  });
});
