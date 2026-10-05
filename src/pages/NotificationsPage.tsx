// Pages (Sprint 7). Notifications — spec alldemos/ocdemo/notifications.html.
// React only — data flows through src/lib/api/ use-cases.

import { useState, useEffect } from 'react';
import type { DmStore } from '../lib/api/dm-store';
import { useApi } from '../lib/api';

interface NotificationsPageProps {
  dmStore: DmStore;
}

export function NotificationsPage({ dmStore }: NotificationsPageProps) {
  const { store } = useApi();
  const [items, setItems] = useState<Array<{ id: string; text: string; unread: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [mentionsOn, setMentionsOn] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    async function load() {
      try {
        const threads = await dmStore.listInbox('user');
        const items: Array<{ id: string; text: string; unread: boolean }> = [];
        // Replies to your posts show up as alerts too (X-style).
        try {
          const mine = new Set((await store.listPosts('user')).map((p) => p.id));
          const names = new Map((await store.listPersonas()).map((p) => [p.id, p.displayName] as const));
          const replies = (await store.listReplies())
            .filter((r) => mine.has(r.postId) && r.authorId !== 'user')
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 10);
          for (const r of replies) {
            items.push({
              id: `reply-${r.id}`,
              text: `${names.get(r.authorId) ?? r.authorId} replied: ${r.body}`,
              unread: true,
            });
          }
        } catch {
          // replies are best-effort; DMs below still show
        }
        for (const t of threads.slice(0, 10)) {
          items.push({
            id: t.threadId,
            text: t.lastDm?.body ?? '',
            unread: t.unread,
          });
        }
        setItems(items);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dmStore, store]);

  useEffect(() => {
    async function hydrate() {
      try {
        const chat = await store.getAgentConfig('notifications_chat');
        const mentions = await store.getAgentConfig('notifications_mentions');
        const qs = await store.getAgentConfig('quiet_start');
        const qe = await store.getAgentConfig('quiet_end');
        if (chat) setChatOn(chat.value === '1');
        if (mentions) setMentionsOn(mentions.value === '1');
        if (qs) setQuietStart(qs.value);
        if (qe) setQuietEnd(qe.value);
      } catch (err) {
        console.error('Failed to hydrate notification settings:', err);
      }
    }
    hydrate();
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await store.setAgentConfig('notifications_chat', chatOn ? '1' : '0');
      } catch (err) {
        if (!cancelled) console.error('Failed to save chat setting:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [store, chatOn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await store.setAgentConfig('notifications_mentions', mentionsOn ? '1' : '0');
      } catch (err) {
        if (!cancelled) console.error('Failed to save mentions setting:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [store, mentionsOn]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await store.setAgentConfig('quiet_start', quietStart);
      } catch (err) {
        if (!cancelled) console.error('Failed to save quiet start:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [store, quietStart]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await store.setAgentConfig('quiet_end', quietEnd);
      } catch (err) {
        if (!cancelled) console.error('Failed to save quiet end:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [store, quietEnd]);

  const unreadCount = items.filter((i) => i.unread).length;

  return (
    <div className="content-area">
      <h2 className="page-title">Alerts {unreadCount > 0 && <span style={{ color: 'var(--accent)' }}>({unreadCount} unread)</span>}</h2>
      {loading && <p className="meta">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="meta">No notifications yet.</p>
      )}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li key={item.id} className="notification-item" style={item.unread ? { borderLeft: '4px solid var(--accent)', background: 'rgba(0,0,0,0.05)' } : undefined}>
            {item.unread && <b>New: </b>}
            {item.text}
          </li>
        ))}
      </ul>
      <br/>
      <label className="check-label">
        <input type="checkbox" checked={chatOn} onChange={(e) => setChatOn(e.target.checked)} />
        Chat notifications
      </label>
      <br/>
      <label className="check-label">
        <input type="checkbox" checked={mentionsOn} onChange={(e) => setMentionsOn(e.target.checked)} />
        Mention notifications
      </label>
      <br/><br/>
      <div className="field-row">
        <label style={{ flex: 1 }}>
          <span className="meta">Quiet start</span>
          <input
            type="time"
            value={quietStart}
            onChange={(e) => setQuietStart(e.target.value)}
            className="input-field"
            style={{ marginTop: 4 }}
          />
        </label>
        <span className="meta" style={{ alignSelf: 'center' }}>to</span>
        <label style={{ flex: 1 }}>
          <span className="meta">Quiet end</span>
          <input
            type="time"
            value={quietEnd}
            onChange={(e) => setQuietEnd(e.target.value)}
            className="input-field"
            style={{ marginTop: 4 }}
          />
        </label>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>Quiet hours are stored locally and applied in-app.</p>
    </div>
  );
}
