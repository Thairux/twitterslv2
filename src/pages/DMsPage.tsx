// Pages (Sprint 6). DMs inbox — spec alldemos/ocdemo/dms.html.
// React only — data flows through src/lib/api/ use-cases.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import type { ThreadInboxItem } from '../lib/api/dm-store';

export function DMsPage() {
  const { dmStore } = useApi();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const items = await dmStore.listInbox('user');
        if (!cancelled) setThreads(items);
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
  }, [dmStore]);

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
      {threads.map((t) => (
        <div
          key={t.threadId}
          className="thread"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/messages/${encodeURIComponent(t.otherPersona.id)}`)}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="avatar" style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--bg)', fontSize: 14 }}>
              {t.otherPersona.displayName[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.otherPersona.displayName}
              </div>
              <div className="meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.lastDm.senderId === 'user' ? 'You: ' : ''}{t.lastDm.body}
              </div>
            </div>
            <div className="meta" style={{ fontSize: 10, flexShrink: 0 }}>
              {formatTime(t.lastDm.createdAt)}
            </div>
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
