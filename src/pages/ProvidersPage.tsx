// Pages: /providers — OpenCode-style provider profiles (3.0.0 S2).
// List, editor, chain order, budgets, cached models, import/export.
// Keys are re-entered on import and never leave secure storage.

import { useState, useEffect } from 'react';
import { useApi } from '../lib/api';
import { ModelClient, normalizeEndpoint } from '../lib/api/model-client';
import {
  refreshProfileModels,
  exportProfileTemplate,
  parseProfileTemplate,
  providerUsage,
  MIGRATED_FLAG,
  type ProviderProfile,
} from '../lib/api/providers';

const KINDS = ['chat', 'image', 'caption', 'local'] as const;

function slug(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `prof-${s || 'provider'}-${Date.now().toString(36)}`;
}

export function ProvidersPage() {
  const { store, secrets } = useApi();
  const [profiles, setProfiles] = useState<ProviderProfile[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [endpoints, setEndpoints] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [cached, setCached] = useState<Record<string, Array<{ id: string; name?: string }>>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<string>('chat');
  const [error, setError] = useState('');
  const [migrated, setMigrated] = useState(false);

  async function reload() {
    try {
      const list = (await store.listProviderProfiles()) as ProviderProfile[];
      setProfiles(list);
      const hk: Record<string, boolean> = {};
      for (const p of list) {
        hk[p.id] = !!(await secrets.getProfileApiKey(p.id).catch(() => null));
      }
      setHasKey(hk);
      try {
        setMigrated(!!(await store.getAgentConfig(MIGRATED_FLAG)));
      } catch {
        setMigrated(false);
      }
    } catch (e) {
      setError(`Load failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function addProfile() {
    const name = newName.trim();
    if (!name) return;
    try {
      await store.upsertProviderProfile({ id: slug(name), name, kind: newKind, priority: profiles.length });
      setNewName('');
      await reload();
    } catch (e) {
      setError(`Add failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function saveProfile(p: ProviderProfile) {
    try {
      const base = normalizeEndpoint(endpoints[p.id] ?? p.endpoint);
      await store.upsertProviderProfile({
        id: p.id,
        name: (names[p.id] ?? p.name).trim() || p.name,
        kind: p.kind,
        endpoint: base,
        authType: p.authType,
        authHeader: p.authHeader,
        model: (models[p.id] ?? p.model ?? '').trim() || undefined,
        priority: p.priority,
        budgetJson: budgets[p.id] ?? p.budgetJson,
      });
      const key = (keys[p.id] ?? '').trim();
      if (key) {
        await secrets.setProfileApiKey(p.id, key);
        setKeys((prev) => ({ ...prev, [p.id]: '' }));
      }
      setStatus((prev) => ({ ...prev, [p.id]: '[SAVED] Template stored; key in secure storage.' }));
      await reload();
    } catch (e) {
      setError(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function discover(p: ProviderProfile) {
    try {
      const base = normalizeEndpoint(endpoints[p.id] ?? p.endpoint);
      if (!base) {
        setStatus((prev) => ({ ...prev, [p.id]: 'Enter an endpoint URL first.' }));
        return;
      }
      const key = (await secrets.getProfileApiKey(p.id).catch(() => null)) ?? undefined;
      const found = await refreshProfileModels(store, secrets, p.id).catch(async () => {
        const probe = await new ModelClient(base, key).probe();
        return probe.models;
      });
      setCached((prev) => ({ ...prev, [p.id]: found }));
      setStatus((prev) => ({ ...prev, [p.id]: found.length > 0 ? `Found ${found.length} model(s).` : 'Reachable, no models listed — type the id manually.' }));
    } catch (e) {
      setStatus((prev) => ({ ...prev, [p.id]: `Discovery failed: ${e instanceof Error ? e.message : String(e)}` }));
    }
  }

  async function move(p: ProviderProfile, dir: -1 | 1) {
    try {
      const same = profiles.filter((x) => x.kind === p.kind).sort((a, b) => a.priority - b.priority);
      const idx = same.findIndex((x) => x.id === p.id);
      const other = same[idx + dir];
      if (!other) return;
      await store.upsertProviderProfile({ ...p, priority: other.priority });
      await store.upsertProviderProfile({ ...other, priority: p.priority });
      await reload();
    } catch (e) {
      setError(`Reorder failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function remove(p: ProviderProfile) {
    try {
      await store.deleteProviderProfile(p.id);
      await secrets.clearProfileSecrets(p.id).catch(() => {});
      await reload();
    } catch (e) {
      setError(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function exportTemplate(p: ProviderProfile) {
    try {
      const blob = new Blob([exportProfileTemplate(p)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tsl-provider-${p.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function importTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseProfileTemplate(await file.text());
      await store.upsertProviderProfile({
        id: slug(parsed.name), name: parsed.name, kind: parsed.kind,
        endpoint: normalizeEndpoint(parsed.endpoint), authType: parsed.authType,
        authHeader: parsed.authHeader, model: parsed.model,
        priority: parsed.priority, budgetJson: JSON.stringify({ maxCallsPerHour: parsed.maxCallsPerHour }),
      });
      setStatus((prev) => ({ ...prev, __import: '[IMPORTED] Re-enter its key, then Save.' }));
      await reload();
    } catch (err) {
      setError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      e.target.value = '';
    }
  }

  async function assignPersona(personaId: string, profileId: string) {
    try {
      await store.setPersonaProvider(personaId.trim(), profileId || null);
      setStatus((prev) => ({ ...prev, __route: profileId ? `[ROUTED] ${personaId} → ${profileId}` : '[ROUTED] override cleared' }));
    } catch (e) {
      setError(`Route failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="content-area" data-testid="providers-page">
      <h2 className="page-title">Providers</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p className="meta" style={{ marginBottom: 8 }}>
        OpenCode-style templates: endpoint + auth + model + chain order +
        hourly budget. Keys live in secure storage; exports never include
        them. {migrated ? 'Legacy providers auto-migrated.' : ''}
      </p>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New provider name…"
          className="input-field"
          data-testid="profile-name-input"
        />
        <select value={newKind} onChange={(e) => setNewKind(e.target.value)} className="input-field" style={{ flex: '0 0 auto' }} aria-label="Kind">
          {KINDS.map((k) => (
            <option key={k} value={k}>{k.toUpperCase()}</option>
          ))}
        </select>
        <button className="btn" onClick={addProfile} disabled={!newName.trim()} data-testid="profile-add">
          Add
        </button>
        <label className="btn" style={{ fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>
          Import
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importTemplate} data-testid="profile-import" />
        </label>
      </div>
      {status.__import && <p className="meta">{status.__import}</p>}
      {profiles.length === 0 && <p className="meta">No provider templates yet. Add one above.</p>}
      {profiles.map((p) => (
        <div key={p.id} className="model-card" data-testid={`profile-${p.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <b>{p.name}</b> <span className="meta">[{p.kind.toUpperCase()}] #{p.priority}</span>
              <div className="meta">
                Model: {p.model ?? 'none'} · {hasKey[p.id] ? 'key stored' : 'no key'} · used {providerUsage(p.id)}/h
              </div>
            </div>
            <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => move(p, -1)}>↑</button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => move(p, 1)}>↓</button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => remove(p)}>Del</button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="meta">Name</label>
            <input type="text" value={names[p.id] ?? p.name} onChange={(e) => setNames((prev) => ({ ...prev, [p.id]: e.target.value }))} className="input-field" style={{ marginTop: 4 }} />
            <label className="meta" style={{ marginTop: 4 }}>Endpoint URL</label>
            <input type="text" value={endpoints[p.id] ?? p.endpoint} onChange={(e) => setEndpoints((prev) => ({ ...prev, [p.id]: e.target.value }))} placeholder="https://…" className="input-field" style={{ marginTop: 4 }} data-testid={`profile-endpoint-${p.id}`} />
            <div className="field-row" style={{ marginTop: 4 }}>
              <select
                value={p.authType}
                onChange={async (e) => {
                  try {
                    await store.upsertProviderProfile({ ...p, authType: e.target.value });
                    await reload();
                  } catch (err) {
                    setError(`Auth save failed: ${err instanceof Error ? err.message : String(err)}`);
                  }
                }}
                className="input-field"
                style={{ flex: '0 0 auto' }}
                aria-label="Auth type"
              >
                <option value="bearer">Bearer</option>
                <option value="header">Header</option>
              </select>
              {p.authType === 'header' && (
                <input
                  type="text"
                  defaultValue={p.authHeader}
                  onBlur={async (e) => {
                    try {
                      await store.upsertProviderProfile({ ...p, authHeader: e.target.value.trim() });
                      await reload();
                    } catch (err) {
                      setError(`Header save failed: ${err instanceof Error ? err.message : String(err)}`);
                    }
                  }}
                  placeholder="x-api-key"
                  className="input-field"
                />
              )}
            </div>
            <label className="meta" style={{ marginTop: 4 }}>API key {hasKey[p.id] && '(stored — type to replace)'}</label>
            <div className="field-row" style={{ marginTop: 4 }}>
              <input type="password" value={keys[p.id] ?? ''} onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))} placeholder={hasKey[p.id] ? '••••••' : 'sk-…'} className="input-field" data-testid={`profile-key-${p.id}`} />
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => saveProfile(p)}>Save</button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => discover(p)} data-testid={`profile-discover-${p.id}`}>Discover</button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => exportTemplate(p)}>Export</button>
            </div>
            <label className="meta" style={{ marginTop: 4 }}>Model id</label>
            <input type="text" value={models[p.id] ?? p.model ?? ''} onChange={(e) => setModels((prev) => ({ ...prev, [p.id]: e.target.value }))} placeholder="e.g. stepfun/step-3.7-flash:free" className="input-field" style={{ marginTop: 4 }} />
            {(cached[p.id] ?? []).length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(cached[p.id] ?? []).slice(0, 10).map((m) => (
                  <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12 }}>{m.name ?? m.id}</span>
                    <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setModels((prev) => ({ ...prev, [p.id]: m.id }))}>
                      {p.model === m.id ? 'Selected' : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="meta" style={{ marginTop: 4 }}>Hourly budget (0 = unlimited)</label>
            <div className="field-row" style={{ marginTop: 4 }}>
              <input
                type="number"
                min={0}
                defaultValue={(() => { try { return (JSON.parse(p.budgetJson ?? '{}') as { maxCallsPerHour?: number }).maxCallsPerHour ?? 0; } catch { return 0; } })()}
                onBlur={async (e) => {
                  try {
                    await store.upsertProviderProfile({ ...p, budgetJson: JSON.stringify({ maxCallsPerHour: Math.max(0, parseInt(e.target.value || '0', 10)) }) });
                    setBudgets((prev) => ({ ...prev, [p.id]: JSON.stringify({ maxCallsPerHour: Math.max(0, parseInt(e.target.value || '0', 10)) }) }));
                    await reload();
                  } catch (err) {
                    setError(`Budget save failed: ${err instanceof Error ? err.message : String(err)}`);
                  }
                }}
                className="input-field"
              />
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => saveProfile(p)}>Save all</button>
            </div>
            {status[p.id] && <p className="meta" style={{ marginTop: 4 }}>{status[p.id]}</p>}
          </div>
        </div>
      ))}
      <div className="model-card" style={{ marginTop: 12 }} data-testid="persona-route">
        <b>Per-persona routing</b>
        <p className="meta">Pin a persona to a provider (overrides chain).</p>
        <PersonaRouter onRoute={assignPersona} />
        {status.__route && <p className="meta">{status.__route}</p>}
      </div>
    </div>
  );
}

function PersonaRouter({ onRoute }: { onRoute: (personaId: string, profileId: string) => void }) {
  const { store } = useApi();
  const [personas, setPersonas] = useState<Array<{ id: string; displayName: string }>>([]);
  const [personasProfiles, setPersonasProfiles] = useState<ProviderProfile[]>([]);
  const [who, setWho] = useState('');
  const [which, setWhich] = useState('');
  useEffect(() => {
    (async () => {
      try {
        setPersonas((await store.listPersonas()).filter((p) => p.id !== 'user'));
        setPersonasProfiles(((await store.listProviderProfiles('chat')) as ProviderProfile[]));
      } catch {
        // ignore
      }
    })();
  }, [store]);
  return (
    <div className="field-row" style={{ marginTop: 4 }}>
      <select value={who} onChange={(e) => setWho(e.target.value)} className="input-field" aria-label="Persona">
        <option value="">Persona…</option>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>{p.displayName}</option>
        ))}
      </select>
      <select value={which} onChange={(e) => setWhich(e.target.value)} className="input-field" aria-label="Provider">
        <option value="">Chain default…</option>
        {personasProfiles.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} disabled={!who} onClick={() => onRoute(who, which)}>
        Route
      </button>
    </div>
  );
}
