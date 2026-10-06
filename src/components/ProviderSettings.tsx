// Components: OpenCode-style model provider templates + per-kind model pickers.
// Each provider (chat/image/caption) is saved as its own template: metadata
// in SQLite, endpoint URL + API key in Preferences (rule 07 — never SQLite).
// "Use" loads a template into the matching global slot.

import { useState, useEffect } from 'react';
import type { Store } from '../lib/api/store';
import type { Secrets } from '../lib/api/secrets';
import type { ProviderKind } from '../store/schema';
import { ModelClient, normalizeEndpoint } from '../lib/api/model-client';
import { refreshConfig } from '../lib/config';

const KINDS: ProviderKind[] = ['chat', 'image', 'caption'];

function kindLabel(kind: ProviderKind): string {
  return kind === 'chat' ? 'CHAT' : kind === 'image' ? 'IMAGE' : 'CAPTION';
}

interface ProviderRow {
  id: string;
  name: string;
  kind: ProviderKind;
  selectedModel?: string;
  active: boolean;
}

function slug(name: string): string {
  const s = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${s || 'provider'}-${Date.now().toString(36)}`;
}

export function ProviderManager({ store, secrets }: { store: Store; secrets: Secrets }) {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [endpoints, setEndpoints] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [hasKey, setHasKey] = useState<Record<string, boolean>>({});
  const [models, setModels] = useState<Record<string, Array<{ id: string; name?: string }>>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<ProviderKind>('chat');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  async function reload() {
    try {
      const list = await store.listProviders();
      setProviders(list);
      const ep: Record<string, string> = {};
      const hk: Record<string, boolean> = {};
      for (const p of list) {
        ep[p.id] = await secrets.getProviderEndpoint(p.id);
        hk[p.id] = !!(await secrets.getProviderApiKey(p.id));
      }
      setEndpoints(ep);
      setHasKey(hk);
    } catch (e) {
      setError(`Failed to load providers: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  function setFlag(id: string, v: boolean) {
    setBusy((prev) => ({ ...prev, [id]: v }));
  }

  async function addProvider(preset?: { name: string; kind: ProviderKind; endpoint: string }) {
    const name = (preset?.name ?? newName).trim();
    if (!name) return;
    const kind = preset?.kind ?? newKind;
    try {
      const id = slug(name);
      await store.upsertProvider({ id, name, kind, active: false });
      if (preset?.endpoint) await secrets.setProviderEndpoint(id, preset.endpoint);
      setNewName('');
      await reload();
    } catch (e) {
      setError(`Add failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function saveCreds(p: ProviderRow) {
    setFlag(p.id, true);
    setError('');
    try {
      const base = normalizeEndpoint(endpoints[p.id] ?? '');
      if (!base) {
        setStatus((prev) => ({ ...prev, [p.id]: 'Enter an endpoint URL first.' }));
        return;
      }
      await secrets.setProviderEndpoint(p.id, base);
      setEndpoints((prev) => ({ ...prev, [p.id]: base }));
      const key = (keys[p.id] ?? '').trim();
      if (key) {
        await secrets.setProviderApiKey(p.id, key);
        setKeys((prev) => ({ ...prev, [p.id]: '' }));
        setHasKey((prev) => ({ ...prev, [p.id]: true }));
      }
      setStatus((prev) => ({ ...prev, [p.id]: '[SAVED] Credentials stored on this device.' }));
    } catch (e) {
      setError(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFlag(p.id, false);
    }
  }

  async function discover(p: ProviderRow) {
    setFlag(p.id, true);
    try {
      const base = normalizeEndpoint(endpoints[p.id] ?? '');
      if (!base) {
        setStatus((prev) => ({ ...prev, [p.id]: 'Enter an endpoint URL first.' }));
        return;
      }
      const key = (await secrets.getProviderApiKey(p.id)) ?? undefined;
      const probe = await new ModelClient(base, key).probe();
      setModels((prev) => ({ ...prev, [p.id]: probe.models }));
      setStatus((prev) => ({
        ...prev,
        [p.id]: probe.models.length > 0
          ? `Found ${probe.models.length} model(s) via ${probe.via}.`
          : (probe.ok ? `Reachable via ${probe.via}, no models listed.` : (probe.error ?? 'Discovery failed.')),
      }));
    } catch (e) {
      setStatus((prev) => ({ ...prev, [p.id]: `Discovery failed: ${e instanceof Error ? e.message : String(e)}` }));
    } finally {
      setFlag(p.id, false);
    }
  }

  async function selectModel(p: ProviderRow, modelId: string) {
    try {
      await store.upsertProvider({ id: p.id, name: p.name, kind: p.kind, selectedModel: modelId });
      if (p.kind === 'chat') await secrets.setSelectedModel(modelId);
      if (p.kind === 'image') await secrets.setSelectedImageModel(modelId);
      if (p.kind === 'caption') await secrets.setSelectedCaptionModel(modelId);
      try { await refreshConfig(); } catch { /* ignore */ }
      await reload();
    } catch (e) {
      setError(`Select failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function useProvider(p: ProviderRow) {
    setFlag(p.id, true);
    setError('');
    try {
      await store.setActiveProvider(p.kind, p.id);
      const base = normalizeEndpoint(endpoints[p.id] ?? '');
      const key = (await secrets.getProviderApiKey(p.id)) ?? undefined;
      if (p.kind === 'chat') {
        if (base) await secrets.setEndpoint(base);
        if (key) await secrets.setApiKey(key);
        else await secrets.clearApiKey();
        if (p.selectedModel) await secrets.setSelectedModel(p.selectedModel);
      } else if (p.kind === 'image') {
        if (base) await secrets.setImageGenEndpoint(base);
        if (p.selectedModel) await secrets.setSelectedImageModel(p.selectedModel);
      } else {
        if (base) await secrets.setCaptionEndpoint(base);
        if (p.selectedModel) await secrets.setSelectedCaptionModel(p.selectedModel);
      }
      try { await refreshConfig(); } catch { /* ignore */ }
      await reload();
    } catch (e) {
      setError(`Activate failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setFlag(p.id, false);
    }
  }

  async function removeProvider(p: ProviderRow) {
    try {
      await store.deleteProvider(p.id);
      await secrets.clearProviderSecrets(p.id);
      await reload();
    } catch (e) {
      setError(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function saveEdit(p: ProviderRow) {
    const name = editName.trim();
    if (!name) return;
    try {
      await store.upsertProvider({ id: p.id, name, kind: p.kind, selectedModel: p.selectedModel });
      setEditingId(null);
      await reload();
    } catch (e) {
      setError(`Rename failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div data-testid="provider-manager">
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New provider name…"
          className="input-field"
          data-testid="provider-name-input"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as ProviderKind)}
          className="input-field"
          style={{ flex: '0 0 auto' }}
          aria-label="Provider kind"
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>{kindLabel(k)}</option>
          ))}
        </select>
        <button className="btn" onClick={() => addProvider()} disabled={!newName.trim()} data-testid="provider-add">
          Add
        </button>
      </div>
      <div className="field-row" style={{ marginBottom: 12 }}>
        <button
          className="btn"
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={() => addProvider({ name: 'Kilo gateway', kind: 'chat', endpoint: 'https://api.kilo.ai/api/gateway' })}
        >
          + Kilo template
        </button>
      </div>
      {providers.length === 0 && <p className="meta">No provider templates yet. Add one above.</p>}
      {providers.map((p) => (
        <div key={p.id} className="model-card" data-testid={`provider-${p.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              {editingId === p.id ? (
                <div className="field-row" style={{ marginTop: 0 }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field"
                  />
                  <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => saveEdit(p)}>Save</button>
                  <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <b>{p.name}</b>{' '}
                  <span className="meta">[{kindLabel(p.kind)}]</span>{' '}
                  {p.active && <span className="meta" style={{ color: 'var(--accent)' }}>[ACTIVE]</span>}
                </>
              )}
              <div className="meta">Model: {p.selectedModel ?? 'none'}{hasKey[p.id] ? ' · key stored' : ''}</div>
            </div>
            <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
              {!p.active && (
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => useProvider(p)} disabled={!!busy[p.id]}>
                  Use
                </button>
              )}
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setEditingId(p.id); setEditName(p.name); }}>
                Edit
              </button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeProvider(p)}>
                Del
              </button>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label className="meta">Endpoint URL</label>
            <div className="field-row" style={{ marginTop: 4 }}>
              <input
                type="text"
                value={endpoints[p.id] ?? ''}
                onChange={(e) => setEndpoints((prev) => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="https://…"
                className="input-field"
                data-testid={`provider-endpoint-${p.id}`}
              />
            </div>
            <label className="meta" style={{ marginTop: 4 }}>API key {hasKey[p.id] && '(stored — type to replace)'}</label>
            <div className="field-row" style={{ marginTop: 4 }}>
              <input
                type="password"
                value={keys[p.id] ?? ''}
                onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                placeholder={hasKey[p.id] ? '••••••' : 'sk-…'}
                className="input-field"
                data-testid={`provider-key-${p.id}`}
              />
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => saveCreds(p)} disabled={!!busy[p.id]}>
                Save
              </button>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => discover(p)} disabled={!!busy[p.id]} data-testid={`provider-discover-${p.id}`}>
                {busy[p.id] ? '…' : 'Discover'}
              </button>
            </div>
            {status[p.id] && <p className="meta" style={{ marginTop: 4 }}>{status[p.id]}</p>}
            {(models[p.id] ?? []).length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }} data-testid={`provider-models-${p.id}`}>
                {(models[p.id] ?? []).slice(0, 20).map((m) => (
                  <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-all', fontSize: 12 }}>{m.name ?? m.id}</span>
                    <button className="btn" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }} onClick={() => selectModel(p, m.id)}>
                      {p.selectedModel === m.id ? 'Selected' : 'Select'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface KindPickerProps {
  kind: Exclude<ProviderKind, 'chat'>;
  store: Store;
  secrets: Secrets;
  localModels: Array<{ id: string; repo: string; path: string; sizeBytes: number }>;
  onChanged?: () => void;
}

/** Model picker for the image/caption slots: cloud models + local downloads. */
export function ModelKindPicker({ kind, store, secrets, localModels, onChanged }: KindPickerProps) {
  const [activeName, setActiveName] = useState<string>('none');
  const [activeEndpoint, setActiveEndpoint] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [cloud, setCloud] = useState<Array<{ id: string; name?: string }>>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const testid = kind === 'image' ? 'image' : 'caption';

  async function load() {
    try {
      const active = await store.getActiveProvider(kind);
      setActiveName(active ? active.name : 'none');
      if (active) {
        setActiveEndpoint(await secrets.getProviderEndpoint(active.id));
        setSelected(active.selectedModel ?? null);
      } else {
        setActiveEndpoint('');
        setSelected(kind === 'image' ? await secrets.getSelectedImageModel() : await secrets.getSelectedCaptionModel());
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function discover() {
    const active = await store.getActiveProvider(kind);
    if (!active) {
      setStatus('No active provider — activate one above first.');
      return;
    }
    setBusy(true);
    try {
      const base = normalizeEndpoint(await secrets.getProviderEndpoint(active.id));
      if (!base) {
        setStatus('Active provider has no endpoint URL.');
        return;
      }
      const key = (await secrets.getProviderApiKey(active.id)) ?? undefined;
      const probe = await new ModelClient(base, key).probe();
      setCloud(probe.models);
      setStatus(
        probe.models.length > 0
          ? `Found ${probe.models.length} model(s).`
          : (probe.ok ? 'Reachable, no models listed.' : (probe.error ?? 'Discovery failed.')),
      );
    } catch (e) {
      setStatus(`Discovery failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function choose(modelId: string) {
    try {
      if (kind === 'image') await secrets.setSelectedImageModel(modelId);
      else await secrets.setSelectedCaptionModel(modelId);
      const active = await store.getActiveProvider(kind);
      if (active) await store.upsertProvider({ id: active.id, name: active.name, kind, selectedModel: modelId });
      try { await refreshConfig(); } catch { /* ignore */ }
      setSelected(modelId);
      onChanged?.();
    } catch {
      setStatus('Save failed.');
    }
  }

  return (
    <div data-testid={`${testid}-picker`}>
      <p className="meta">
        Active provider: <b>{activeName}</b>
        {activeEndpoint ? ` (${activeEndpoint})` : ''} · Selected: <b>{selected ?? 'none'}</b>
      </p>
      <div className="field-row" style={{ marginTop: 4 }}>
        <input
          type="text"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Type a model id…"
          className="input-field"
          data-testid={`${testid}-model-id`}
        />
        <button className="btn" onClick={() => { if (manual.trim()) choose(manual.trim()); }} disabled={!manual.trim()}>
          Use
        </button>
        <button className="btn" onClick={discover} disabled={busy} data-testid={`${testid}-discover`}>
          {busy ? '…' : 'Discover'}
        </button>
      </div>
      {status && <p className="meta" style={{ marginTop: 4 }}>{status}</p>}
      {cloud.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cloud.slice(0, 20).map((m) => (
            <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-all', fontSize: 12 }}>{m.name ?? m.id}</span>
              <button className="btn" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }} onClick={() => choose(m.id)}>
                {selected === m.id ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      )}
      {localModels.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p className="meta">Downloaded local models</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {localModels.map((m) => (
              <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-all', fontSize: 12 }}>{m.repo}</span>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }} onClick={() => choose(m.id)}>
                  {selected === m.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
