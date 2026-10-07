import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Store } from '../lib/api/store';
import type { Secrets } from '../lib/api/secrets';
import type { FilesAdapter } from '../native/files';
import { useApi } from '../lib/api';
import { ModelClient, normalizeEndpoint } from '../lib/api/model-client';
import {
  getAmbientStatus,
  type AmbientStatus,
} from '../lib/api/ambient-status';
import {
  getInferencePolicy,
  ambientLocalEnabled,
  validateInference,
  isCooled,
  cooldownUntil,
  getFallbackCounters,
  type InferencePolicyMode,
  type InferenceState,
} from '../lib/api/inference-policy';
import { runLocalModel } from '../native/inference';
import { onResumeTick } from '../lib/background';
import { exportAllData, importBackup } from '../lib/api/export';
import { storageBreakdown, pruneOrphanedBlobs } from '../lib/api/storage-man';
import { lastOpenBackend } from '../native/db';

interface SettingsPageProps {
  store: Store;
  secrets: Secrets;
  modelService?: {
    listLocalModels: () => Promise<Array<{ id: string; repo: string; path: string; sizeBytes: number; recRamGb: number }>>;
    listEndpointModels: () => Promise<Array<{ id: string; name?: string }>>;
  };
  /** Kept for compatibility; Settings builds a live client from field values. */
  client?: {
    listModels: () => Promise<Array<{ id: string; name?: string }>>;
    chat: (messages: Array<{ role: string; content: string }>, opts?: { model?: string }) => Promise<string>;
  };
  nativeFiles?: FilesAdapter;
}

interface PendingMemory {
  id: string;
  personaId: string;
  fact: string;
}

function MemoryApproval({ store }: { store: Store }) {
  const [pending, setPending] = useState<PendingMemory[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const rows = await store.query<any>('SELECT id, persona_id AS personaId, fact FROM pending_memories ORDER BY created_at ASC');
        setPending(rows);
      } catch {
        setPending([]);
      }
    }
    load();
  }, [store]);

  async function approve(id: string) {
    store.approveMemory(id);
    setPending((prev) => prev.filter((m) => m.id !== id));
  }

  if (pending.length === 0) {
    return <p className="meta">No pending memories.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {pending.map((m) => (
        <div key={m.id} className="post">
          <div className="post-body">{m.fact}</div>
          <div className="meta">Persona: {m.personaId}</div>
          <button className="btn" onClick={() => approve(m.id)}>Approve</button>
        </div>
      ))}
    </div>
  );
}

export function SettingsPage({ store, secrets, modelService, nativeFiles }: SettingsPageProps) {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [imageGenEndpoint, setImageGenEndpoint] = useState('');
  const [captionEndpoint, setCaptionEndpoint] = useState('');
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [newWord, setNewWord] = useState('');
  const [mutedRules, setMutedRules] = useState<Array<{ word: string; surfaces: string[]; expiresAt: string | null }>>([]);
  const [newWordSurfaces, setNewWordSurfaces] = useState<string[]>(['timeline', 'notifications', 'replies']);
  const [newWordExpiry, setNewWordExpiry] = useState('never');
  const [protectedPosts, setProtectedPosts] = useState(false);
  const [simLog, setSimLog] = useState('');

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelIdInput, setModelIdInput] = useState('');
  const [localModels, setLocalModels] = useState<Array<{ id: string; repo: string; path: string; sizeBytes: number; recRamGb: number }>>([]);
  const [endpointModels, setEndpointModels] = useState<Array<{ id: string; name?: string }>>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoverStatus, setDiscoverStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [ambient, setAmbient] = useState<AmbientStatus>(() => getAmbientStatus());
  const [policy, setPolicy] = useState<InferencePolicyMode>('strict');
  const [ambientLocal, setAmbientLocal] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState('');
  const [cooldowns, setCooldowns] = useState<Array<{ key: string; count: number }>>([]);
  const [runningLocal, setRunningLocal] = useState(false);
  const autoDiscoveredFor = useRef<string | null>(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [storageInfo, setStorageInfo] = useState('');
  const [fontScale, setFontScale] = useState('100');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [haptics, setHaptics] = useState(true);
  const { client: liveApiClient } = useApi();

  async function runSimTick(kind: 'ping' | 'spawn') {
    setSimLog(kind === 'ping' ? 'Running friend ping...' : 'Running weekly spawn...');
    try {
      await onResumeTick(store, liveApiClient, secrets);
      const personas = await store.listPersonas();
      setSimLog(
        kind === 'ping'
          ? `Friend ping complete — check your DMs. (${personas.length} personas on the island)`
          : `Weekly spawn complete. (${personas.length} personas on the island)`,
      );
    } catch (err) {
      console.error('Simulation tick failed:', err);
      setSimLog('Simulation tick failed.');
    } finally {
      setAmbient(getAmbientStatus());
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const ep = await secrets.getEndpoint();
        const key = await secrets.getApiKey();
        setHasStoredKey(!!key);
        const imgEp = await secrets.getImageGenEndpoint();
        const capEp = await secrets.getCaptionEndpoint();
        const selModel = await secrets.getSelectedModel();
        setEndpoint(ep ?? '');
        setApiKey(key ?? '');
        setImageGenEndpoint(imgEp ?? '');
        setCaptionEndpoint(capEp ?? '');
        setSelectedModel(selModel);
        setModelIdInput(selModel ?? '');
        const profile = await store.getUserProfile();
        setDisplayName(profile.displayName);
        setBio(profile.bio);
        const cfg = await store.getAgentConfig('memory_consent');
        setConsent(cfg?.value === '1');
        const words = await store.listMutedWords();
        // One-time migration: legacy global words → all-surface rules.
        try {
          const migrated = await store.getAgentConfig('muted_migrated_v18');
          const existing = await store.listMutedWordRules().catch(() => []);
          if (!migrated && words.length > 0 && existing.length === 0) {
            for (const w of words) {
              await store.upsertMutedWordRule(w, ['timeline', 'notifications', 'replies'], null).catch(() => {});
            }
            await store.setAgentConfig('muted_migrated_v18', new Date().toISOString()).catch(() => {});
          }
          setMutedRules(await store.listMutedWordRules().catch(() => []));
        } catch {
          // ignore
        }
        const privacy = await store.getAgentConfig('protected_posts');
        setProtectedPosts(privacy?.value === '1');
        try {
          const fs = await store.getAgentConfig('font_scale');
          if (fs) {
            setFontScale(fs.value);
            applyA11y(fs.value, reduceMotion);
          }
          const rm = await store.getAgentConfig('reduce_motion');
          if (rm?.value === '1') {
            setReduceMotion(true);
            applyA11y(fs?.value ?? fontScale, true);
          }
          const hap = await store.getAgentConfig('haptics');
          if (hap?.value === '0') setHaptics(false);
        } catch {
          // a11y prefs are best-effort
        }
        try {
          setPolicy(await getInferencePolicy(store));
        } catch {
          // default strict stands
        }
        try {
          setAmbientLocal(await ambientLocalEnabled(store));
        } catch {
          // default off stands
        }
        setCooldowns(getFallbackCounters());
        if (modelService) {
          const local = await modelService.listLocalModels();
          setLocalModels(local);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [store, secrets, modelService]);

  // Always act on a client built from the live field values — the client
  // created at app boot goes stale the moment the user edits endpoint/key.
  function liveClient(): ModelClient | null {
    const base = normalizeEndpoint(endpoint);
    if (!base) return null;
    const key = apiKey.trim();
    return new ModelClient(base, key || undefined);
  }

  async function persistEndpoint(): Promise<string | null> {
    const base = normalizeEndpoint(endpoint);
    if (!base) return null;
    if (base !== endpoint) setEndpoint(base);
    try {
      await secrets.setEndpoint(base);
      if (apiKey.trim()) {
        await secrets.setApiKey(apiKey.trim());
        setHasStoredKey(true);
      }
    } catch {
      // non-fatal; callers still use the normalized value in-memory
    }
    return base;
  }

  async function discoverModels() {
    const probeClient = liveClient();
    if (!probeClient) {
      setDiscoverStatus('Enter a Model Endpoint URL first, then discover.');
      return;
    }
    setDiscovering(true);
    setError('');
    setDiscoverStatus('Probing /v1/models, /models, /health…');
    try {
      const probe = await probeClient.probe();
      setEndpointModels(probe.models);
      autoDiscoveredFor.current = normalizeEndpoint(endpoint);
      if (probe.models.length > 0) {
        setDiscoverStatus(`Found ${probe.models.length} model${probe.models.length === 1 ? '' : 's'} via ${probe.via}.`);
      } else if (probe.ok) {
        setDiscoverStatus(`Endpoint reachable via ${probe.via} but listed no models. Type the model id manually below.`);
      } else {
        setDiscoverStatus(probe.error ?? 'Discovery failed.');
      }
    } catch (e) {
      setDiscoverStatus(`Discovery failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDiscovering(false);
    }
  }

  // Automatic discovery: probe once per endpoint value so the picker
  // populates itself instead of waiting for a manual tap.
  useEffect(() => {
    const base = normalizeEndpoint(endpoint);
    if (base && autoDiscoveredFor.current !== base) {
      discoverModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function addMutedRule() {
    const word = newWord.trim().toLowerCase();
    if (!word || newWordSurfaces.length === 0) return;
    const expiresAt =
      newWordExpiry === 'never'
        ? null
        : new Date(Date.now() + (newWordExpiry === '24h' ? 86400000 : newWordExpiry === '7d' ? 604800000 : 2592000000)).toISOString();
    try {
      await store.upsertMutedWordRule(word, newWordSurfaces, expiresAt);
      setNewWord('');
      setMutedRules(await store.listMutedWordRules().catch(() => []));
    } catch (e) {
      setError(`Mute add failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function removeMutedRule(word: string) {
    try {
      await store.removeMutedWordRule(word);
      try {
        await store.removeMutedWord(word);
      } catch {
        // legacy row may not exist
      }
      setMutedRules(await store.listMutedWordRules().catch(() => []));
    } catch (e) {
      setError(`Mute remove failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handlePolicy(mode: InferencePolicyMode) {
    setPolicy(mode);
    try {
      await store.setAgentConfig('inference_policy', mode);
    } catch (e) {
      setError(`Failed to save policy: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleAmbientLocal(on: boolean) {
    setAmbientLocal(on);
    try {
      await store.setAgentConfig('ambient_local', on ? '1' : '0');
    } catch (e) {
      setError(`Failed to save local toggle: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Real inference validation: minimal chat proving the full path. */
  async function handleValidate() {
    const chatClient = liveClient();
    if (!chatClient) {
      setError('Enter a Model Endpoint URL first.');
      return;
    }
    const model = modelIdInput.trim() || selectedModel || undefined;
    setValidating(true);
    setError('');
    setValidation('');
    try {
      await persistEndpoint();
      const probed = new ModelClient(chatClient.chatEndpoint, chatClient.chatApiKey, model ? { defaultModel: model } : {});
      const res = await validateInference(probed);
      const state: InferenceState = res.state;
      setValidation(
        state === 'READY_LIVE'
          ? `[READY_LIVE] inference OK in ${res.latencyMs}ms${res.model ? ` (model ${res.model})` : ''}`
          : `[${state}] ${res.error ?? 'validation failed'} (${res.latencyMs}ms)`,
      );
      setCooldowns(getFallbackCounters());
      setAmbient(getAmbientStatus());
    } catch (e) {
      setValidation(`[ERROR] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setValidating(false);
    }
  }

  async function handleTestChat() {
    const chatClient = liveClient();
    if (!chatClient) {
      setError('Enter a Model Endpoint URL first.');
      return;
    }
    const model = modelIdInput.trim() || selectedModel || undefined;
    setTesting(true);
    setError('');
    setTestResult('');
    try {
      await persistEndpoint();
      if (model) await secrets.setSelectedModel(model);
      if (model) setSelectedModel(model);
      const reply = await chatClient.chat(
        [{ role: 'user', content: 'Reply with exactly: OK' }],
        model ? { model } : {},
      );
      setTestResult(`[endpoint reply] ${reply}`);
      setAmbient(getAmbientStatus());
    } catch (e) {
      setError(`Test chat failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTesting(false);
    }
  }

  async function handleRunLocal() {
    if (!nativeFiles) {
      setError('File storage is unavailable.');
      return;
    }
    const local = localModels.find((m) => m.id === selectedModel) ?? localModels[0];
    if (!local) {
      setError('No downloaded model selected. Download one from the Models tab first.');
      return;
    }
    setRunningLocal(true);
    setError('');
    setTestResult('');
    try {
      const res = await runLocalModel(nativeFiles, local.path, 'Say hello in one short sentence.');
      setTestResult(`${res.simulated ? '[browser-sim] ' : '[on-device] '}${res.text}`);
    } catch (e) {
      setError(`Local run failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunningLocal(false);
    }
  }

  async function handleCheck() {
    const probeClient = liveClient();
    if (!probeClient) {
      setError('Enter a Model Endpoint URL first.');
      return;
    }
    setError('');
    setOk('');
    await persistEndpoint();
    try {
      const probe = await probeClient.probe();
      if (probe.ok && probe.models.length > 0) {
        setOk(`[OK] Endpoint reachable — ${probe.models.length} model(s) via ${probe.via}`);
        setEndpointModels(probe.models);
      } else if (probe.ok) {
        setOk(`[OK] Endpoint reachable via ${probe.via} (no model list; type the id manually)`);
      } else {
        setError(`[ERR] ${probe.error ?? 'Cannot reach endpoint'}`);
      }
    } catch {
      setError('[ERR] Cannot reach endpoint');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setOk('');
    try {
      await secrets.setEndpoint(endpoint);
      if (apiKey) {
        await secrets.setApiKey(apiKey);
        setHasStoredKey(true);
      } else {
        await secrets.clearApiKey();
      }
      // Save Configuration used to drop the model id: the next ambient beat
      // then sent model-less requests, gateway 400s, silent offline pools.
      const model = modelIdInput.trim() || selectedModel;
      if (model) {
        await secrets.setSelectedModel(model);
        setSelectedModel(model);
      }
      await secrets.setImageGenEndpoint(imageGenEndpoint);
      await secrets.setCaptionEndpoint(captionEndpoint);
      store.updateUserProfile({
        displayName: displayName || 'You',
        handle: (await store.getUserProfile()).handle,
        bio,
      });
      store.setAgentConfig('memory_consent', consent ? '1' : '0');
      store.setAgentConfig('protected_posts', protectedPosts ? '1' : '0');
      setOk('[SAVED]');
      setTimeout(() => setOk(''), 2000);
    } catch (e) {
      setError(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearKey() {
    setApiKey('');
    try {
      await secrets.clearApiKey();
      setHasStoredKey(false);
    } catch {
      setError('Failed to clear API key');
    }
  }

  async function handleSelectModel(modelId: string) {
    setSelectedModel(modelId);
    setModelIdInput(modelId);
    try {
      await secrets.setSelectedModel(modelId);
    } catch (e) {
      setError(`Failed to save model selection: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleExport() {
    try {
      const data = await exportAllData(store);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `twittersl-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setOk('[EXPORTED]');
      setTimeout(() => setOk(''), 2000);
    } catch (e) {
      setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleImportFile(file: File) {
    setError('');
    setImportResult('');
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== 'object') throw new Error('Not a TSL backup file.');
      const res = await importBackup(store, parsed as Record<string, unknown>);
      const parts: string[] = [];
      for (const [table, n] of Object.entries(res.added)) parts.push(`${table} +${n}`);
      for (const [table, n] of Object.entries(res.skipped)) parts.push(`${table} skip ${n}`);
      setImportResult(`[IMPORTED] ${parts.join(' · ') || 'nothing new'}`);
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function refreshStorage() {
    if (!nativeFiles) {
      setStorageInfo('File storage unavailable.');
      return;
    }
    try {
      const info = await storageBreakdown(nativeFiles, store);
      const cats = Object.entries(info.byPrefix).map(([k, v]) => `${k}: ${v}`).join(', ');
      setStorageInfo(`${info.total} blobs (${cats || 'none'}) · ${info.orphaned.length} orphaned`);
    } catch (e) {
      setStorageInfo(`Storage check failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handlePrune() {
    if (!nativeFiles) return;
    try {
      const n = await pruneOrphanedBlobs(nativeFiles, store);
      setStorageInfo(`Pruned ${n} orphaned blobs.`);
      await refreshStorage();
    } catch (e) {
      setError(`Prune failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function applyA11y(scale: string, motion: boolean) {
    try {
      const pct = Math.min(150, Math.max(80, parseInt(scale || '100', 10) || 100));
      document.documentElement.style.setProperty('--font-scale', String(pct / 100));
      document.documentElement.classList.toggle('reduce-motion', motion);
    } catch {
      // ignore
    }
  }

  async function handleFontScale(v: string) {
    setFontScale(v);
    applyA11y(v, reduceMotion);
    try {
      await store.setAgentConfig('font_scale', v);
    } catch {
      // ignore
    }
  }

  async function handleReduceMotion(on: boolean) {
    setReduceMotion(on);
    applyA11y(fontScale, on);
    try {
      await store.setAgentConfig('reduce_motion', on ? '1' : '0');
    } catch {
      // ignore
    }
  }

  async function handleHaptics(on: boolean) {
    setHaptics(on);
    try {
      await store.setAgentConfig('haptics', on ? '1' : '0');
    } catch {
      // ignore
    }
  }

  async function handleReset() {
    try {
      const tables = await store.query<any>("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      for (const t of tables) {
        await store.run(`DELETE FROM ${t.name}`);
      }
      setShowResetConfirm(false);
      setOk('[RESET] Reloading...');
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setError(`Reset failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div className="content-area">
      <h2 className="page-title">Configuration</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {ok && <p className="meta">{ok}</p>}

      <label><b>Model Endpoint URL</b>
        <div className="field-row">
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://127.0.0.1:8080"
            className="input-field"
          />
          <button className="btn" onClick={handleCheck}>Check</button>
        </div>
      </label>
      <p className="help-text">
        Directs where the app sends AI inference requests.<br/><br/>
        <b>Recommended:</b> Leave as <i>http://127.0.0.1:8080</i> with a local GGUF model
        from the Models tab for completely private, offline inference.<br/>
        Use an external URL only if you have a cloud LLM provider.
      </p>
      <br/>

      <label><b>API Key</b> <span className="meta">(cloud providers only)</span>
        <div className="field-row">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="input-field"
          />
          <button className="btn" onClick={handleClearKey}>Clear</button>
        </div>
      </label>
      {hasStoredKey && <p className="meta" data-testid="key-stored">[KEY STORED] A key is saved on this device. Type a new one to replace it.</p>}
      <p className="help-text">
        Only required if your Model Endpoint is a cloud service (e.g. OpenAI, Anthropic, custom hosted API).<br/>
        <b>Leave blank for local GGUF inference.</b> Stored securely in device SecureStore — never logged or transmitted elsewhere.
      </p>
      <br/>

      <label><b>Image Generation Endpoint</b> <span className="meta">(optional)</span>
        <div className="field-row">
          <input
            type="text"
            value={imageGenEndpoint}
            onChange={(e) => setImageGenEndpoint(e.target.value)}
            placeholder="http://127.0.0.1:8188"
            className="input-field"
          />
        </div>
      </label>
      <p className="help-text">
        Optional sidecar for AI image generation (e.g. Flux/SD). Leave blank to disable image generation.
      </p>
      <br/>

      <label><b>Caption Endpoint</b> <span className="meta">(optional)</span>
        <div className="field-row">
          <input
            type="text"
            value={captionEndpoint}
            onChange={(e) => setCaptionEndpoint(e.target.value)}
            placeholder="http://127.0.0.1:8081"
            className="input-field"
          />
        </div>
      </label>
      <p className="help-text">
        Optional sidecar for image captioning (e.g. Moondream2/LLaVA via llama.cpp mtmd). Leave blank to disable captioning.
      </p>
      <br/>

      <p className="meta">
        Manage your local models in the <Link to="/models" className="btn" style={{ padding: '2px 8px', fontSize: 12 }}>Models Tab</Link>.
      </p>
      <p className="meta" style={{ marginTop: 4 }}>
        Open the <Link to="/tslp" className="btn" style={{ padding: '2px 8px', fontSize: 12 }} data-testid="settings-tslp-link">#tslp admin</Link> for personas, dashboards, and friend creator.
      </p>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Model Selector</h3>
      <p className="meta" data-testid="selected-model">
        Current selection: <b>{selectedModel ?? 'none'}</b>
      </p>

      <label><b>Model ID</b> <span className="meta">(sent with endpoint requests)</span>
        <div className="field-row" style={{ marginTop: 4 }}>
          <input
            type="text"
            value={modelIdInput}
            onChange={(e) => setModelIdInput(e.target.value)}
            placeholder="e.g. stepfun/step-3.7-flash:free"
            className="input-field"
            data-testid="model-id-input"
          />
          <button
            className="btn"
            onClick={() => { if (modelIdInput.trim()) handleSelectModel(modelIdInput.trim()); }}
            disabled={!modelIdInput.trim()}
          >
            Use
          </button>
        </div>
      </label>
      <p className="help-text">
        For cloud gateways (e.g. Kilo), paste the gateway URL into Model Endpoint above,
        add your API key, then either Discover or type the model id
        (e.g. <i>stepfun/step-3.7-flash:free</i>) here. Local GGUF downloads need no endpoint or key.
      </p>
      <div className="field-row" style={{ marginTop: 4 }}>
        <button
          className="btn"
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={() => { setModelIdInput('stepfun/step-3.7-flash:free'); handleSelectModel('stepfun/step-3.7-flash:free'); }}
        >
          Kilo: step-3.7-flash:free
        </button>
        <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={handleTestChat} disabled={testing} data-testid="test-chat-btn">
          {testing ? 'Testing…' : 'Send test chat'}
        </button>
        <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={handleRunLocal} disabled={runningLocal} data-testid="run-local-btn">
          {runningLocal ? 'Running…' : 'Run local model'}
        </button>
      </div>
      {testResult && <p className="meta" data-testid="test-result" style={{ marginTop: 4, wordBreak: 'break-word' }}>{testResult}</p>}
      <p className="meta" data-testid="ambient-status" style={{ marginTop: 4 }}>
        Ambient engine: <b>{ambient.live ? 'LIVE via endpoint' : 'offline pools'}</b>
        {ambient.lastError ? ` (last fallback ${ambient.lastWhere ?? ''}: ${ambient.lastError})` : ''}
        {' '}<button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setAmbient(getAmbientStatus()); setCooldowns(getFallbackCounters()); }}>Refresh</button>
      </p>
      <div className="field-row" style={{ marginTop: 4 }}>
        <span className="meta">Inference policy:</span>
        {(['strict', 'hybrid', 'offline'] as InferencePolicyMode[]).map((m) => (
          <button
            key={m}
            className="btn"
            style={{ fontSize: 10, padding: '2px 8px', ...(policy === m ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
            onClick={() => handlePolicy(m)}
            data-testid={`policy-${m}`}
          >
            {m === 'strict' ? 'Strict' : m === 'hybrid' ? 'Hybrid' : 'Offline'}
          </button>
        ))}
      </div>
      <p className="help-text">
        Strict (default): a failing provider posts nothing — diagnostics
        instead of fake pool content. Hybrid: pools with offline origin.
        Offline: pools by choice.
      </p>
      <label className="check-label" style={{ marginTop: 4 }}>
        <input type="checkbox" checked={ambientLocal} onChange={(e) => handleAmbientLocal(e.target.checked)} data-testid="ambient-local-toggle" />
        Ambient local fallback (downloaded GGUF when cloud fails)
      </label>
      <div className="field-row" style={{ marginTop: 4 }}>
        <button className="btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={handleValidate} disabled={validating} data-testid="validate-btn">
          {validating ? 'Validating…' : 'Validate inference'}
        </button>
      </div>
      {validation && <p className="meta" data-testid="validation-result" style={{ marginTop: 4, wordBreak: 'break-word' }}>{validation}</p>}
      {cooldowns.length > 0 && (
        <p className="meta" style={{ marginTop: 4 }}>
          Fallback causes: {cooldowns.slice(0, 5).map((c) => `${c.key} ×${c.count}`).join(' · ')}
          {isCooled(normalizeEndpoint(endpoint)) && cooldownUntil(normalizeEndpoint(endpoint))
            ? ` — cooling until ${new Date(cooldownUntil(normalizeEndpoint(endpoint)) as number).toLocaleTimeString()}`
            : ''}
        </p>
      )}

      <div style={{ marginBottom: 12, marginTop: 12 }}>
        <label><b>Endpoint Models</b> <span className="meta">(auto-discovered{endpoint ? ` from ${endpoint}` : ''})</span>
          <div className="field-row" style={{ marginTop: 4 }}>
            <button className="btn" onClick={discoverModels} disabled={discovering} data-testid="discover-btn">
              {discovering ? 'Discovering…' : 'Discover Models'}
            </button>
          </div>
        </label>
        {discoverStatus && <p className="meta" data-testid="discover-status" style={{ marginTop: 4 }}>{discoverStatus}</p>}
        {endpointModels.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }} data-testid="endpoint-models">
            {endpointModels.map((m) => (
              <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-all' }}>{m.name ?? m.id}</span>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }} onClick={() => handleSelectModel(m.id)}>
                  {selectedModel === m.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label><b>Downloaded Local Models</b></label>
        {modelService && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {localModels.map((m) => (
              <div key={m.id} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ minWidth: 0, overflow: 'hidden', wordBreak: 'break-all' }}>{m.repo} <span className="meta">({(m.sizeBytes / (1024 * 1024)).toFixed(1)} MB)</span></span>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0 }} onClick={() => handleSelectModel(m.id)}>
                  {selectedModel === m.id ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
            {localModels.length === 0 && <p className="meta">No downloaded models.</p>}
          </div>
        )}
      </div>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Model Providers</h3>
      <p className="meta" style={{ marginBottom: 8 }}>
        Providers moved to their own page: chain order, budgets, model
        cache, per-persona routing, import/export.
      </p>
      <p className="meta" style={{ marginBottom: 8 }}>
        Open the <Link to="/providers" className="btn" style={{ padding: '2px 8px', fontSize: 12 }} data-testid="settings-providers-link">Providers page</Link> to manage chat, image, caption, and local providers.
      </p>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Data</h3>
      <p className="meta" data-testid="storage-backend">
        Storage: <b>{lastOpenBackend === 'native' ? 'on-device database (survives restarts)' : lastOpenBackend === 'web' ? 'in-memory (data is lost on restart!) — reinstall or report this' : 'unknown'}</b>
      </p>
      <div className="field-row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button className="btn" onClick={handleExport}>Export Data</button>
        <label className="btn" style={{ cursor: 'pointer' }}>
          Import Backup
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            data-testid="import-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = '';
            }}
          />
        </label>
        <button className="btn" onClick={() => setShowResetConfirm(true)}>Reset All Data</button>
      </div>
      {importResult && <p className="meta" data-testid="import-result" style={{ marginTop: 4 }}>{importResult}</p>}
      <div className="field-row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={refreshStorage} data-testid="storage-refresh">Storage Info</button>
        <button className="btn" onClick={handlePrune} data-testid="storage-prune">Prune Orphans</button>
      </div>
      {storageInfo && <p className="meta" data-testid="storage-info" style={{ marginTop: 4 }}>{storageInfo}</p>}
      {showResetConfirm && (
        <div style={{ marginTop: 8, padding: 8, border: '2px solid red', borderRadius: 4 }}>
          <p style={{ color: 'red' }}>This will permanently delete all posts, replies, DMs, bookmarks, personas, and settings. This cannot be undone.</p>
          <div className="field-row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={handleReset} style={{ color: 'red' }}>Confirm Reset</button>
            <button className="btn" onClick={() => setShowResetConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <br/><br/>
      <label className="check-label">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        Explicit Persona Memory Consent
      </label>
      <br/><br/>

      <label><b>Profile Details</b>
        <div className="field-stack">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
            className="input-field"
          />
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio"
            className="input-field"
          />
        </div>
      </label>
      <br/><br/>

      <button className="btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Configuration'}
      </button>
      <span id="saveStatus" className="meta">{ok}</span>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Accessibility</h3>
      <label className="meta">Text size ({fontScale}%)</label>
      <div className="field-row" style={{ marginTop: 4 }}>
        <input
          type="range"
          min={80}
          max={150}
          step={5}
          value={fontScale}
          onChange={(e) => handleFontScale(e.target.value)}
          className="input-field"
          data-testid="a11y-font"
          aria-label="Text size percent"
        />
      </div>
      <label className="check-label" style={{ marginTop: 4 }}>
        <input type="checkbox" checked={reduceMotion} onChange={(e) => handleReduceMotion(e.target.checked)} data-testid="a11y-motion" />
        Reduce motion
      </label>
      <br/>
      <label className="check-label">
        <input type="checkbox" checked={haptics} onChange={(e) => handleHaptics(e.target.checked)} data-testid="a11y-haptics" />
        Haptics (where supported)
      </label>
      <p className="meta">DMs can be read aloud from any chat via the speaker button — voices differ per persona role.</p>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Memory</h3>
      <p className="meta">Persona memory proposals are stored locally and require your approval before they become permanent.</p>
      <MemoryApproval store={store} />

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Privacy</h3>
      <label className="check-label">
        <input type="checkbox" checked={protectedPosts} onChange={(e) => setProtectedPosts(e.target.checked)} />
        Protected posts (approve followers)
      </label>
      <p className="meta">When enabled, new followers require approval before seeing your posts.</p>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Muted Words</h3>
      <p className="meta" style={{ marginBottom: 8 }}>Rules apply per surface and can expire. Legacy global words were migrated below.</p>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Add word to mute..."
          className="input-field"
        />
        <button className="btn" data-testid="mute-add" onClick={addMutedRule}>Add</button>
      </div>
      <div className="field-row" style={{ marginBottom: 8 }}>
        {(['timeline', 'notifications', 'replies'] as const).map((s) => (
          <label key={s} className="check-label" style={{ fontSize: 11 }}>
            <input
              type="checkbox"
              checked={newWordSurfaces.includes(s)}
              onChange={() => setNewWordSurfaces((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
            />
            {s}
          </label>
        ))}
        <select value={newWordExpiry} onChange={(e) => setNewWordExpiry(e.target.value)} className="input-field" style={{ flex: '0 0 auto' }} aria-label="Expiry">
          <option value="never">Never expires</option>
          <option value="24h">24 hours</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {mutedRules.map((r) => (
          <div key={r.word} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} data-testid={`mute-rule-${r.word}`}>
            <span>{r.word} <span className="meta">({r.surfaces.join(', ')}{r.expiresAt ? ` · until ${r.expiresAt.slice(0, 10)}` : ''})</span></span>
            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeMutedRule(r.word)}>Remove</button>
          </div>
        ))}
        {mutedRules.length === 0 && <p className="meta">No muted words.</p>}
      </div>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Background Simulation</h3>
      <p className="meta">Trigger offline simulation actions manually.</p>
      <div className="field-row" style={{ flexWrap: 'wrap' }}>
        <button className="btn" onClick={() => runSimTick('ping')}>Friend Ping</button>
        <button className="btn" onClick={() => runSimTick('spawn')}>Weekly Spawn</button>
      </div>
      {simLog && <p className="meta" style={{ marginTop: 8 }}>{simLog}</p>}
    </div>
  );
}
