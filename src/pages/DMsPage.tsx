// Pages (Sprint 6). DMs inbox — spec alldemos/ocdemo/dms.html.
// React only — data flows through src/lib/api/ use-cases.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import type { ThreadInboxItem } from '../lib/api/dm-store';
import { PersonaAvatar } from '../components/PersonaAvatar';

export function DMsPage() {
  const { dmStore, store } = useApi();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadInboxItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [seeds, setSeeds] = useState<Map<string, string>>(new Map());
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const items = await dmStore.listInbox('user');
        if (!cancelled) setThreads(items);
        try {
          if (!cancelled) setFavorites(new Set(await store.listFavorites()));
        } catch {
          // ignore
        }
        try {
          const personas = await store.listPersonas();
          if (!cancelled) setSeeds(new Map(personas.map((p) => [p.id, p.avatarSeed || p.id])));
        } catch {
          // ignore
        }
        try {
          if (!cancelled) setPins(new Set(await store.listPinnedThreads()));
        } catch {
          // ignore
        }
        try {
          const cfg = await store.getAgentConfig('thread_labels');
          if (!cancelled && cfg) {
            const parsed: unknown = JSON.parse(cfg.value);
            if (parsed && typeof parsed === 'object') {
              setLabels(parsed as Record<string, string>);
            }
          }
        } catch {
          // ignore
        }
      } catch (e) {
        console.error('Failed to load inbox:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // Live inbox: pick up new persona DMs without leaving the screen.
    const timer = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [dmStore, store]);

  const visible = threads.filter((t) => !favoritesOnly || favorites.has(t.otherPersona.id));
  const favThreads = threads.filter((t) => favorites.has(t.otherPersona.id));
  const pinned = visible.filter((t) => pins.has(t.threadId));
  const unpinned = visible.filter((t) => !pins.has(t.threadId));

  async function togglePin(threadId: string) {
    try {
      const on = await store.togglePinThread(threadId);
      setPins((prev) => {
        const next = new Set(prev);
        if (on) next.add(threadId);
        else next.delete(threadId);
        return next;
      });
    } catch {
      // ignore
    }
  }

  async function saveLabel(threadId: string) {
    const next = { ...labels };
    const text = labelDraft.trim().slice(0, 24);
    if (text) next[threadId] = text;
    else delete next[threadId];
    setLabels(next);
    setEditingLabel(null);
    setLabelDraft('');
    try {
      await store.setAgentConfig('thread_labels', JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return (
    <div className="content-area">
      <div className="status-bar">
        <h2 className="page-title" style={{ margin: 0, border: 'none', padding: 0 }}>Inbox</h2>
        <button className="btn" onClick={() => navigate('/search?tab=personas')}>+ New DM</button>
      </div>
      {loading && <p className="meta">Loading…</p>}
      {!loading && threads.length === 0 && (
        <p className="meta">No messages yet.</p>
      )}
      {!loading && threads.length > 0 && (
        <div className="field-row" style={{ marginBottom: 8 }}>
          <button
            className="btn"
            style={{ fontSize: 11, padding: '4px 8px', ...(favoritesOnly ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
            onClick={() => setFavoritesOnly((v) => !v)}
            data-testid="inbox-favorites-filter"
          >
            ★ Favorites{favoritesOnly ? ` (${favThreads.length})` : ''}
          </button>
        </div>
      )}
      {favThreads.length > 0 && !favoritesOnly && (
        <p className="meta" style={{ marginBottom: 4 }}>★ {favThreads.length} favorite thread{favThreads.length === 1 ? '' : 's'} below</p>
      )}
      {[...pinned, ...unpinned].map((t) => (
        <div
          key={t.threadId}
          className="thread"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/messages/${encodeURIComponent(t.otherPersona.id)}`)}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PersonaAvatar seed={seeds.get(t.otherPersona.id) ?? t.otherPersona.id} displayName={t.otherPersona.displayName} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pins.has(t.threadId) && <span>📌 </span>}
                {favorites.has(t.otherPersona.id) && <span style={{ color: 'var(--accent)' }}>★ </span>}{t.otherPersona.displayName}
                {labels[t.threadId] && <span className="meta"> · {labels[t.threadId]}</span>}
              </div>
              <div className="meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.lastDm.senderId === 'user' ? 'You: ' : ''}{t.lastDm.body}
              </div>
            </div>
            <div className="meta" style={{ fontSize: 10, flexShrink: 0, textAlign: 'right' }}>
              {t.unread && (
                <span data-testid="inbox-unread" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>● NEW<br /></span>
              )}
              {formatTime(t.lastDm.createdAt)}
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn" style={{ fontSize: 9, padding: '1px 6px' }} onClick={() => togglePin(t.threadId)} data-testid={`pin-${t.otherPersona.id}`}>
              {pins.has(t.threadId) ? 'Unpin' : 'Pin'}
            </button>
            {editingLabel === t.threadId ? (
              <>
                <input
                  type="text"
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(t.threadId); }}
                  placeholder="Label…"
                  maxLength={24}
                  className="input-field"
                  style={{ fontSize: 11 }}
                  data-testid="label-input"
                />
                <button className="btn" style={{ fontSize: 9, padding: '1px 6px' }} onClick={() => saveLabel(t.threadId)}>OK</button>
              </>
            ) : (
              <button
                className="btn"
                style={{ fontSize: 9, padding: '1px 6px' }}
                onClick={() => { setEditingLabel(t.threadId); setLabelDraft(labels[t.threadId] ?? ''); }}
              >
                🏷
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
