import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Store } from '../lib/api/store';
import type { Secrets } from '../lib/api/secrets';
import { onResumeTick } from '../lib/background';

interface SettingsPageProps {
  store: Store;
  secrets: Secrets;
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

export function SettingsPage({ store, secrets }: SettingsPageProps) {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [protectedPosts, setProtectedPosts] = useState(false);
  const [simLog, setSimLog] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const ep = await secrets.getEndpoint();
        const key = await secrets.getApiKey();
        setEndpoint(ep ?? '');
        setApiKey(key ?? '');
        const profile = await store.getUserProfile();
        setDisplayName(profile.displayName);
        setBio(profile.bio);
        const cfg = await store.getAgentConfig('memory_consent');
        setConsent(cfg?.value === '1');
        const words = await store.listMutedWords();
        setMutedWords(words);
        const privacy = await store.getAgentConfig('protected_posts');
        setProtectedPosts(privacy?.value === '1');
      } catch {
        // ignore
      }
    }
    load();
  }, [store, secrets]);

  async function handleCheck() {
    setError('');
    setOk('');
    try {
      const base = endpoint.replace(/\/$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setOk(res.ok ? '[OK] Endpoint reachable' : '[WARN] Non-200 response');
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
      } else {
        await secrets.clearApiKey();
      }
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
    } catch {
      setError('Failed to clear API key');
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
      <p className="help-text">
        Only required if your Model Endpoint is a cloud service (e.g. OpenAI, Anthropic, custom hosted API).<br/>
        <b>Leave blank for local GGUF inference.</b> Stored securely in device SecureStore — never logged or transmitted elsewhere.
      </p>
      <br/>

      <p className="meta">
        Manage your local models in the <Link to="/models" className="btn" style={{ padding: '2px 8px', fontSize: 12 }}>Models Tab</Link>.
      </p>

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
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Add word to mute..."
          className="input-field"
        />
        <button className="btn" onClick={async () => { if (!newWord.trim()) return; await store.addMutedWord(newWord.trim()); setNewWord(''); const words = await store.listMutedWords(); setMutedWords(words); }}>Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {mutedWords.map((w) => (
          <div key={w} className="post" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{w}</span>
            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={async () => { await store.removeMutedWord(w); const words = await store.listMutedWords(); setMutedWords(words); }}>Remove</button>
          </div>
        ))}
        {mutedWords.length === 0 && <p className="meta">No muted words.</p>}
      </div>

      <br/><br/>
      <h3 style={{ marginBottom: 8 }}>Background Simulation</h3>
      <p className="meta">Trigger offline simulation actions manually.</p>
      <div className="field-row" style={{ flexWrap: 'wrap' }}>
        <button className="btn" onClick={async () => { setSimLog('Running friend ping...'); try { await onResumeTick(store, (window as any).__tsl?.modelClient); setSimLog('Friend ping complete.'); } catch (err) { console.error('Friend ping failed:', err); setSimLog('Friend ping failed.'); } }}>Friend Ping</button>
        <button className="btn" onClick={async () => { setSimLog('Running weekly spawn...'); try { await onResumeTick(store, (window as any).__tsl?.modelClient); setSimLog('Weekly spawn complete.'); } catch (err) { console.error('Weekly spawn failed:', err); setSimLog('Weekly spawn failed.'); } }}>Weekly Spawn</button>
      </div>
      {simLog && <p className="meta" style={{ marginTop: 8 }}>{simLog}</p>}
    </div>
  );
}
