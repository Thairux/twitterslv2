// Pages: #tslp — "twitter sl personas" admin panel.
// Phone-style view of every persona, their persona↔persona DMs, their DMs
// with you, favorites, activity dashboards, and the friend creator.
// READ-heavy by design; writes are explicit buttons (create friend, stars).

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import type { Store } from '../lib/api/store';
import { PersonaAvatar } from '../components/PersonaAvatar';
import { getPromptLog } from '../lib/api/ambient-status';
import { loadPersonaContexts } from '../lib/api/persona-context';
import { personaStats, todayStats, type PersonaStats, type DayStats } from '../lib/api/stats';
import { generatePersona } from '../lib/api/persona-generator';
import { ModelClient } from '../lib/api/model-client';
import { buildLiveClient } from '../lib/api/inference-policy';

type MainTab = 'all' | 'favorites' | 'dashboards' | 'create' | 'sim' | 'prompts';
type DetailTab = 'posts' | 'dms-you' | 'dms-island';

interface PersonaLite {
  id: string;
  handle: string;
  displayName: string;
  role: string;
  vibe: string;
  bio: string;
  affinity: number;
  active: boolean;
  avatarSeed: string;
}

export function TslpPage() {
  const { store, client } = useApi();
  const navigate = useNavigate();
  const [tab, setTab] = useState<MainTab>('all');
  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<DayStats | null>(null);
  const [favStats, setFavStats] = useState<PersonaStats[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  async function reload() {
    try {
      const all = await store.listPersonas();
      setPersonas(
        all
          .filter((p) => p.id !== 'user')
          .map((p) => ({
            id: p.id,
            handle: p.handle,
            displayName: p.displayName,
            role: p.role,
            vibe: p.vibe,
            bio: p.bio,
            affinity: p.affinity,
            active: p.active,
            avatarSeed: p.avatarSeed || p.id,
          })),
      );
      setFavorites(new Set(await store.listFavorites()));
      try {
        const pending = await store.query<{ id: string }>('SELECT id FROM pending_memories');
        setPendingCount(pending.length);
      } catch {
        // ignore
      }
      setGlobalStats(await todayStats(store));
      const favIds = await store.listFavorites();
      const stats: PersonaStats[] = [];
      for (const id of favIds.slice(0, 12)) {
        try {
          stats.push(await personaStats(store, id));
        } catch {
          // skip personas whose stats fail
        }
      }
      setFavStats(stats);
    } catch {
      // keep previous state
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function toggleFavorite(id: string) {
    try {
      await store.toggleFavorite(id);
      await reload();
    } catch {
      // ignore
    }
  }

  const needle = filter.trim().toLowerCase();
  const matches = (p: PersonaLite) =>
    !needle ||
    p.displayName.toLowerCase().includes(needle) ||
    p.handle.toLowerCase().includes(needle) ||
    p.role.toLowerCase().includes(needle);
  const visibleAll = personas.filter(matches);
  const visibleFav = personas.filter((p) => favorites.has(p.id) && matches(p));

  return (
    <div className="content-area" style={{ background: '#000', minHeight: '100%' }} data-testid="tslp-page">
      <div
        style={{
          background: '#7b2ff7',
          border: '3px solid #000',
          boxShadow: '6px 6px 0 #f5d90a, 12px 12px 0 rgba(123,47,247,0.55)',
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 26, color: '#fff', letterSpacing: 1 }}>#tslp</div>
        <div className="meta" style={{ color: '#f5d90a' }}>twitter sl personas — island admin</div>
        {pendingCount > 0 && (
          <div className="meta" style={{ color: '#f5d90a', marginTop: 4 }}>
            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => navigate('/settings')} data-testid="tslp-pending-link">
              {pendingCount} memor{pendingCount === 1 ? 'y' : 'ies'} awaiting approval →
            </button>
          </div>
        )}
      </div>

      <div className="feed-tabs">
        {(['all', 'favorites', 'dashboards', 'create', 'sim', 'prompts'] as MainTab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)} data-testid={`tslp-tab-${t}`}>
            {t === 'all' ? 'All' : t === 'favorites' ? '★ Favs' : t === 'dashboards' ? 'Stats' : t === 'create' ? '＋ Friend' : t === 'sim' ? 'Sim' : 'Prompts'}
          </button>
        ))}
      </div>

      {(tab === 'all' || tab === 'favorites') && (
        <>
          <div className="field-row" style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter personas…"
              className="input-field"
              data-testid="tslp-filter"
            />
          </div>
          <p className="meta" style={{ marginBottom: 8 }}>
            {(tab === 'all' ? visibleAll : visibleFav).length} personas
            {tab === 'favorites' ? ' ★' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="tslp-grid">
            {(tab === 'all' ? visibleAll : visibleFav).map((p) => (
              <div key={p.id} className="post" style={{ display: 'flex', gap: 8, alignItems: 'center' }} data-testid={`tslp-card-${p.id}`}>
                <div onClick={() => setSelectedId(p.id)} style={{ cursor: 'pointer' }}>
                  <PersonaAvatar seed={p.avatarSeed} displayName={p.displayName} size={36} />
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>
                  <div style={{ fontWeight: 'bold' }}>
                    {favorites.has(p.id) && <span style={{ color: 'var(--accent)' }}>★ </span>}
                    {p.displayName} <span className="meta">[{p.role}]</span>
                  </div>
                  <div className="meta">@{p.handle}</div>
                </div>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 8px', flexShrink: 0, ...(favorites.has(p.id) ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
                  onClick={() => toggleFavorite(p.id)}
                  data-testid={`tslp-fav-${p.id}`}
                >
                  {favorites.has(p.id) ? '★' : '☆'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'dashboards' && (
        <div data-testid="tslp-dashboards">
          <h3 style={{ marginBottom: 8 }}>Today on the island</h3>
          {globalStats ? (
            <div className="post" data-testid="tslp-global-stats">
              <div className="meta">Posts: <b>{globalStats.posts}</b></div>
              <div className="meta">Replies: <b>{globalStats.replies}</b></div>
              <div className="meta">Likes given: <b>{globalStats.likes}</b></div>
              <div className="meta">DMs to you: <b>{globalStats.dmsToUser}</b></div>
              <div className="meta">DMs to personas: <b>{globalStats.dmsToPersonas}</b></div>
              <div className="meta">Your DMs: <b>{globalStats.dmsFromUser}</b></div>
            </div>
          ) : (
            <p className="meta">Loading stats…</p>
          )}
          <h3 style={{ margin: '16px 0 8px' }}>Favorite personas</h3>
          {favStats.length === 0 && <p className="meta">Star personas to track them here.</p>}
          {favStats.map((s) => (
            <div key={s.personaId} className="post" data-testid={`tslp-favstat-${s.personaId}`}>
              <div style={{ fontWeight: 'bold' }}>{s.displayName}</div>
              <div className="meta">Posts <b>{s.posts}</b> · Replies <b>{s.replies}</b></div>
              <div className="meta">Likes given <b>{s.likesGiven}</b> · received <b>{s.likesReceived}</b></div>
              <div className="meta">DMs to you <b>{s.dmsToUser}</b> · to personas <b>{s.dmsToPersonas}</b> · from you <b>{s.dmsFromUser}</b></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'create' && (
        <FriendCreator
          store={store}
          client={client}
          onDone={(id) => {
            reload();
            navigate(`/messages/${encodeURIComponent(id)}`);
          }}
        />
      )}

      {tab === 'sim' && <SimConsole store={store} client={client} />}

      {tab === 'prompts' && <PromptLog />}

      {selectedId && (
        <PersonaDetail
          personaId={selectedId}
          store={store}
          client={client}
          onClose={() => setSelectedId(null)}
          onToggleFavorite={() => toggleFavorite(selectedId)}
          isFavorite={favorites.has(selectedId)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

function PersonaDetail({
  personaId,
  store,
  client,
  onClose,
  onToggleFavorite,
  isFavorite,
  onChanged,
}: {
  personaId: string;
  store: Store;
  client: ModelClient;
  onClose: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onChanged: () => void;
}) {
  const [persona, setPersona] = useState<PersonaLite | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('posts');
  const [posts, setPosts] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [dmsYou, setDmsYou] = useState<Array<{ id: string; senderId: string; body: string; createdAt: string }>>([]);
  const [dmsIsland, setDmsIsland] = useState<Array<{ id: string; threadId: string; senderId: string; body: string; createdAt: string }>>([]);
  const [stats, setStats] = useState<PersonaStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const p = await store.getPersona(personaId);
        if (!p || cancelled) return;
        setPersona({
          id: p.id,
          handle: p.handle,
          displayName: p.displayName,
          role: p.role,
          vibe: p.vibe,
          bio: p.bio,
          affinity: p.affinity,
          active: p.active,
          avatarSeed: p.avatarSeed || p.id,
        });
        const [postRows, dmRows, st] = await Promise.all([
          store.query<{ id: string; body: string; created_at: string }>(
            'SELECT id, body, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 20',
            [personaId],
          ),
          store.query<{ id: string; thread_id: string; sender_id: string; body: string; created_at: string }>(
            'SELECT id, thread_id, sender_id, body, created_at FROM dms ORDER BY created_at DESC LIMIT 200',
          ),
          personaStats(store, personaId),
        ]);
        if (cancelled) return;
        setPosts(postRows.map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at })));
        setDmsYou(
          dmRows
            .filter((d) => d.thread_id === `user:${personaId}`)
            .map((d) => ({ id: d.id, senderId: d.sender_id, body: d.body, createdAt: d.created_at })),
        );
        // Segment match (not substring): thread ids are `agent:<a>:<b>`,
        // and a raw includes() misattributes threads on overlapping ids.
        const involves = (threadId: string) => threadId.split(':').includes(personaId);
        setDmsIsland(
          dmRows
            .filter((d) => !d.thread_id.startsWith('user:') && (d.sender_id === personaId || involves(d.thread_id)))
            .slice(0, 30)
            .map((d) => ({ id: d.id, threadId: d.thread_id, senderId: d.sender_id, body: d.body, createdAt: d.created_at })),
        );
        setStats(st);
      } catch {
        // keep placeholders
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [store, personaId]);

  if (!persona) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
      data-testid={`tslp-detail-${personaId}`}
    >
      <div
        className="post"
        style={{ maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <PersonaAvatar seed={persona.avatarSeed} displayName={persona.displayName} size={44} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{persona.displayName}</div>
              <div className="meta">@{persona.handle} [{persona.role}] · affinity {Math.round(persona.affinity * 100)}%</div>
              <div className="meta">{persona.bio || persona.vibe}</div>
            </div>
          </div>
          <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={onToggleFavorite}>
              {isFavorite ? '★' : '☆'}
            </button>
            <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        {stats && (
          <p className="meta" style={{ marginTop: 8 }}>
            {stats.posts} posts · {stats.replies} replies · {stats.likesGiven} likes given · {stats.likesReceived} received · {stats.dmsToUser} DMs to you · {stats.dmsToPersonas} to island
          </p>
        )}
        <div className="feed-tabs">
          {(['posts', 'dms-you', 'dms-island'] as DetailTab[]).map((t) => (
            <button key={t} className={detailTab === t ? 'active' : ''} onClick={() => setDetailTab(t)}>
              {t === 'posts' ? 'Posts' : t === 'dms-you' ? 'DMs w/ you' : 'DMs w/ island'}
            </button>
          ))}
        </div>
        {detailTab === 'posts' && (
          <div>
            {posts.length === 0 && <p className="meta">No posts yet.</p>}
            {posts.map((p) => (
              <div key={p.id} className="post" style={{ padding: 8 }}>
                <div className="post-body" style={{ fontSize: 13 }}>{p.body}</div>
                <div className="meta">{new Date(p.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        {detailTab === 'dms-you' && (
          <div>
            {dmsYou.length === 0 && <p className="meta">No DMs with you yet.</p>}
            {dmsYou.map((d) => (
              <div key={d.id} className="msg" style={{ width: '100%' }}>
                <b>{d.senderId === 'user' ? 'You' : persona.displayName}:</b> {d.body}
                <div className="meta">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        {detailTab === 'dms-island' && (
          <div>
            {dmsIsland.length === 0 && <p className="meta">No island DMs yet — they appear after ambient beats.</p>}
            {dmsIsland.map((d) => (
              <div key={d.id} className="post" style={{ padding: 8 }}>
                <div className="meta">{d.threadId} · {d.senderId}</div>
                <div className="post-body" style={{ fontSize: 13 }}>{d.body}</div>
                <div className="meta">{new Date(d.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
        {persona && (
          <PersonaDebugger personaId={persona.id} displayName={persona.displayName} store={store} client={client} onPosted={onChanged} />
        )}
      </div>
    </div>
  );
}

function FriendCreator({
  store,
  client,
  onDone,
}: {
  store: Store;
  client: ModelClient;
  onDone: (id: string) => void;
}) {
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<{
    displayName: string;
    handle: string;
    role: string;
    vibe: string;
    bio: string;
    avatarSeed: string;
  } | null>(null);
  const [via, setVia] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function liveClient(): Promise<ModelClient> {
    // Single shared builder: freshly resolved endpoint/key/model.
    return (await buildLiveClient()) ?? client;
  }

  async function handleGenerate() {
    const theme = description.trim();
    if (!theme || working) return;
    setWorking(true);
    setError('');
    setPreview(null);
    try {
      const mc = await liveClient();
      const res = await generatePersona(mc, theme, [], { allowFriend: true });
      setPreview({
        displayName: String(res.persona.displayName ?? 'Friend'),
        handle: String(res.persona.handle ?? '@friend'),
        role: 'friend',
        vibe: String(res.persona.vibe ?? theme),
        bio: String(res.persona.bio ?? ''),
        avatarSeed: String(res.persona.avatarSeed ?? `friend-${Date.now()}`),
      });
      setVia(res.via);
    } catch (e) {
      setError(`Generation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  async function handleConfirm() {
    if (!preview) return;
    setWorking(true);
    setError('');
    try {
      const id = `friend-${Date.now().toString(36)}`;
      const cleanHandle = preview.handle.replace(/^@/, '').slice(0, 30) || id;
      await store.upsertPersona({
        id,
        handle: cleanHandle,
        displayName: preview.displayName.slice(0, 30),
        role: 'friend',
        vibe: preview.vibe,
        bio: preview.bio || `Made for you: ${description.trim().slice(0, 80)}`,
        avatarSeed: preview.avatarSeed,
        affinity: 1.0,
        active: true,
        spawnedWeek: 0,
      });
      await store.follow(id);
      await store.addFollower(id);
      await store.setAgentConfig('primary_friend_id', id);
      // Arrival ceremony: announce + greet so the island notices.
      try {
        await store.createPost({
          id: `p-arr-${Date.now()}-${id}`,
          authorId: id,
          body: `just arrived on the island — hi, I'm ${preview.displayName}! ${preview.bio.slice(0, 80)}`.slice(0, 280),
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
      onDone(id);
    } catch (e) {
      setError(`Could not create friend: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div data-testid="friend-creator">
      <p className="meta" style={{ marginBottom: 8 }}>
        Describe your friend — personality, vibe, interests. They become your
        personal persona, messaged 1:1 in the Friend tab. Generation uses your
        endpoint when set, offline fallback otherwise. Nothing is sent anywhere
        without you tapping Generate.
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g. a warm stargazer who loves old maps and always cheers me up…"
        rows={4}
        maxLength={500}
        className="input-field"
        style={{ width: '100%', marginBottom: 8 }}
        data-testid="friend-desc"
      />
      <div className="field-row" style={{ marginBottom: 8 }}>
        <button className="btn" onClick={handleGenerate} disabled={working || !description.trim()} data-testid="friend-generate">
          {working ? 'Dreaming…' : 'Generate preview'}
        </button>
      </div>
      {preview && (
        <div className="post" data-testid="friend-preview">
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{preview.displayName}</div>
          <div className="meta">@{preview.handle.replace(/^@/, '')} [friend] · via {via}</div>
          <div className="meta">{preview.vibe}</div>
          <div style={{ marginTop: 4, fontSize: 13 }}>{preview.bio}</div>
          <div className="field-row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={handleConfirm} disabled={working} data-testid="friend-confirm">
              Confirm friend
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SimConsole({ store, client }: { store: Store; client: ModelClient }) {
  const [intervalMs, setIntervalMs] = useState('45000');
  const [paused, setPaused] = useState(false);
  const [theme, setTheme] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDetail, setEventDetail] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ms = await store.getAgentConfig('heartbeat_ms');
        if (ms) setIntervalMs(ms.value);
        const p = await store.getAgentConfig('island_paused');
        setPaused(p?.value === '1');
      } catch {
        // ignore
      }
    })();
  }, [store]);

  async function saveHeartbeat() {
    try {
      const ms = Math.max(15000, parseInt(intervalMs || '45000', 10) || 45000);
      await store.setAgentConfig('heartbeat_ms', String(ms));
      await store.setAgentConfig('island_paused', paused ? '1' : '0');
      setStatus(`[SAVED] beat every ${ms}ms, island ${paused ? 'paused' : 'alive'}.`);
    } catch (e) {
      setStatus(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function manualSpawn() {
    const t = theme.trim();
    if (!t || working) return;
    setWorking(true);
    setStatus('');
    try {
      const res = await generatePersona(client, t, [], {});
      const id = `spawn-${Date.now().toString(36)}`;
      await store.upsertPersona({
        id,
        handle: String(res.persona.handle ?? id).replace(/^@/, '').slice(0, 30) || id,
        displayName: String(res.persona.displayName ?? 'Newcomer').slice(0, 30),
        role: (['fan', 'peer', 'meme', 'troll', 'news'] as const).includes(res.persona.role as never)
          ? (res.persona.role as 'fan' | 'peer' | 'meme' | 'troll' | 'news')
          : 'peer',
        vibe: String(res.persona.vibe ?? t),
        bio: String(res.persona.bio ?? ''),
        avatarSeed: String(res.persona.avatarSeed ?? id),
        affinity: 0.5,
        active: true,
        spawnedWeek: 0,
      });
      await store.createPost({
        id: `p-arr-${Date.now()}-${id}`,
        authorId: id,
        body: `just washed ashore — hi everyone, I'm new here!`.slice(0, 280),
        createdAt: new Date().toISOString(),
        likes: 0,
        reposts: 0,
        origin: res.via === 'glimmer' ? 'glimmer' : 'offline',
        edited: false,
        aiGenerated: res.via === 'glimmer',
      });
      setStatus(`[SPAWNED] ${id} via ${res.via}.`);
      setTheme('');
    } catch (e) {
      setStatus(`Spawn failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  async function triggerEvent() {
    if (!eventTitle.trim()) return;
    try {
      const now = new Date();
      await store.createWorldEvent({
        id: `ev-${Date.now()}`,
        title: eventTitle.trim().slice(0, 80),
        detail: eventDetail.trim().slice(0, 280),
        startsAt: now.toISOString(),
        endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setStatus(`[EVENT] "${eventTitle.trim()}" is live for 24h.`);
      setEventTitle('');
      setEventDetail('');
    } catch (e) {
      setStatus(`Event failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div data-testid="sim-console">
      <h3 style={{ marginBottom: 8 }}>Simulation console</h3>
      <div className="field-row">
        <input type="number" min={15000} step={5000} value={intervalMs} onChange={(e) => setIntervalMs(e.target.value)} className="input-field" aria-label="Heartbeat ms" data-testid="sim-interval" />
        <button className="btn" onClick={saveHeartbeat} data-testid="sim-save">Save beat</button>
        <button
          className="btn"
          onClick={async () => {
            const next = !paused;
            setPaused(next);
            try {
              await store.setAgentConfig('island_paused', next ? '1' : '0');
            } catch {
              // ignore
            }
          }}
          data-testid="sim-pause"
        >
          {paused ? 'Resume island' : 'Pause island'}
        </button>
      </div>
      <div className="field-row" style={{ marginTop: 8 }}>
        <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Spawn theme… (e.g. jazz drummer)" maxLength={120} className="input-field" data-testid="sim-spawn-theme" />
        <button className="btn" onClick={manualSpawn} disabled={working || !theme.trim()} data-testid="sim-spawn">Spawn</button>
      </div>
      <div className="field-row" style={{ marginTop: 8 }}>
        <input type="text" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="World event title…" maxLength={80} className="input-field" data-testid="sim-event-title" />
      </div>
      <div className="field-row" style={{ marginTop: 4 }}>
        <input type="text" value={eventDetail} onChange={(e) => setEventDetail(e.target.value)} placeholder="What happens? (optional)" maxLength={280} className="input-field" data-testid="sim-event-detail" />
        <button className="btn" onClick={triggerEvent} disabled={!eventTitle.trim()} data-testid="sim-event-fire">Trigger</button>
      </div>
      {status && <p className="meta" style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}

function PromptLog() {
  const [entries, setEntries] = useState<Array<{ at: string; where: string; preview: string }>>([]);
  useEffect(() => {
    setEntries(getPromptLog());
  }, []);
  return (
    <div data-testid="prompt-log">
      <h3 style={{ marginBottom: 8 }}>Recent endpoint prompts</h3>
      <button className="btn" style={{ fontSize: 10, padding: '2px 8px', marginBottom: 8 }} onClick={() => setEntries(getPromptLog())}>
        Refresh
      </button>
      {entries.length === 0 && <p className="meta">No prompts recorded yet — ambient beats and chats log here.</p>}
      {entries.map((e, i) => (
        <div key={`${e.at}-${i}`} className="post" style={{ padding: 8 }}>
          <div className="meta">{e.where} · {new Date(e.at).toLocaleTimeString()}</div>
          <div style={{ fontSize: 12 }}>{e.preview}</div>
        </div>
      ))}
    </div>
  );
}

function PersonaDebugger({
  personaId,
  displayName,
  store,
  client,
  onPosted,
}: {
  personaId: string;
  displayName: string;
  store: Store;
  client: ModelClient;
  onPosted: () => void;
}) {
  const [system, setSystem] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [asText, setAsText] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await loadPersonaContexts(store, [personaId]);
        if (!cancelled) setSystem(`You are ${displayName}.${ctx.get(personaId)?.blurb ?? ''} Reply briefly (under 140 chars).`);
      } catch {
        if (!cancelled) setSystem(`You are ${displayName}. Reply briefly (under 140 chars).`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, personaId, displayName]);

  async function debugChat() {
    if (!input.trim() || working) return;
    setWorking(true);
    setError('');
    try {
      const text = await client.chat([
        { role: 'system', content: system ?? `You are ${displayName}.` },
        { role: 'user', content: input.trim() },
      ]);
      setAnswer(text);
    } catch (e) {
      setError(`Debug chat failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  async function postAs() {
    if (!asText.trim() || working) return;
    setWorking(true);
    setError('');
    try {
      await store.createPost({
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        authorId: personaId,
        body: `[admin as ${displayName}] ${asText.trim()}`.slice(0, 280),
        createdAt: new Date().toISOString(),
        likes: 0,
        reposts: 0,
        origin: 'offline',
        edited: false,
        aiGenerated: false,
      });
      setAsText('');
      onPosted();
    } catch (e) {
      setError(`Post failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }} data-testid="persona-debugger">
      <h3 style={{ marginBottom: 8 }}>Debugger</h3>
      {system && <p className="meta" data-testid="debug-system" style={{ wordBreak: 'break-word' }}>system: {system}</p>}
      <div className="field-row">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Talk to them…" maxLength={280} className="input-field" data-testid="debug-input" />
        <button className="btn" onClick={debugChat} disabled={working || !input.trim()} data-testid="debug-send">Ask</button>
      </div>
      {answer && <div className="post" style={{ padding: 8, marginTop: 4 }} data-testid="debug-answer">{answer}</div>}
      <div className="field-row" style={{ marginTop: 8 }}>
        <input type="text" value={asText} onChange={(e) => setAsText(e.target.value)} placeholder={`Write as ${displayName}…`} maxLength={240} className="input-field" data-testid="postas-input" />
        <button className="btn" onClick={postAs} disabled={working || !asText.trim()} data-testid="postas-send">Post</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
