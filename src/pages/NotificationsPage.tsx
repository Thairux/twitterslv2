// Pages (Sprint 7). Notifications — spec alldemos/ocdemo/notifications.html.
// React only — data flows through src/lib/api/ use-cases.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DmStore } from '../lib/api/dm-store';
import { useApi } from '../lib/api';

interface NotificationsPageProps {
  dmStore: DmStore;
}

export function NotificationsPage({ dmStore }: NotificationsPageProps) {
  const { store } = useApi();
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<{ id: string; text: string; unread: boolean; to?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [chatOn, setChatOn] = useState(true);
  const [mentionsOn, setMentionsOn] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    async function load() {
      try {
        const read = await store.listNotificationReads().catch(() => new Set<string>());
        const seen = (id: string) => read.has(id);
        const items: Array<{ id: string; text: string; unread: boolean; to?: string }> = [];
        const names = new Map((await store.listPersonas().catch(() => [])).map((p) => [p.id, p.displayName] as const));
        const nameOf = (id: string) => (id === 'user' ? 'You' : (names.get(id) ?? id));
        // Replies to your posts.
        try {
          const mine = new Set((await store.listPosts('user')).map((p) => p.id));
          const replies = (await store.listReplies())
            .filter((r) => mine.has(r.postId) && r.authorId !== 'user')
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 10);
          for (const r of replies) {
            const id = `reply-${r.id}`;
            items.push({ id, text: `${nameOf(r.authorId)} replied: ${r.body}`, unread: !seen(id), to: `/post/${r.postId}` });
          }
        } catch {
          // ignore
        }
        // Likes and reposts on your posts — grouped per post.
        try {
          const mine = new Set((await store.listPosts('user')).map((p) => p.id));
          const reactions = await store.query<{ post_id: string; persona_id: string; kind: string }>(
            'SELECT post_id, persona_id, kind FROM reactions ORDER BY rowid DESC LIMIT 60',
          );
          const groups = new Map<string, { kind: string; postId: string; who: string[]; seen: string[] }>();
          for (const r of reactions) {
            if (!mine.has(r.post_id) || r.persona_id === 'user') continue;
            const key = `${r.kind}-${r.post_id}`;
            let g = groups.get(key);
            if (!g) {
              g = { kind: r.kind, postId: r.post_id, who: [], seen: [] };
              groups.set(key, g);
            }
            if (!g.seen.includes(r.persona_id)) {
              g.seen.push(r.persona_id);
              g.who.push(nameOf(r.persona_id));
            }
          }
          for (const [key, g] of groups) {
            const id = `reaction-group-${key}`;
            const head = g.who[0] ?? 'Someone';
            const rest = g.who.length > 1 ? ` + ${g.who.length - 1} other${g.who.length > 2 ? 's' : ''}` : '';
            const verb = g.kind === 'like' ? 'liked' : 'reposted';
            items.push({
              id,
              text: `${head}${rest} ${verb} your post`,
              unread: !seen(id),
              to: `/post/${g.postId}`,
            });
            if (items.length >= 30) break;
          }
        } catch {
          // ignore
        }
        // New followers.
        try {
          const followers = await store.listFollowers();
          for (const fid of followers.slice(-5)) {
            const id = `follow-${fid}`;
            items.push({ id, text: `${nameOf(fid)} followed you`, unread: !seen(id), to: `/persona/${fid}` });
          }
        } catch {
          // ignore
        }
        // Quotes of your posts.
        try {
          const mine = new Set((await store.listPosts('user')).map((p) => p.id));
          const all = await store.query<{ id: string; author_id: string; quoted_post_id: string }>(
            'SELECT id, author_id, quoted_post_id FROM posts WHERE quoted_post_id IS NOT NULL ORDER BY rowid DESC LIMIT 20',
          );
          for (const p of all) {
            if (!mine.has(p.quoted_post_id) || p.author_id === 'user') continue;
            const id = `quote-${p.id}`;
            items.push({ id, text: `${nameOf(p.author_id)} quoted your post`, unread: !seen(id), to: `/post/${p.id}` });
          }
        } catch {
          // ignore
        }
        // DM threads.
        const threads = await dmStore.listInbox('user');
        for (const t of threads.slice(0, 10)) {
          const id = `dm-${t.threadId}`;
          items.push({
            id,
            text: `${t.otherPersona.displayName}: ${t.lastDm?.body ?? ''}`,
            unread: t.unread && !seen(id),
            to: `/messages/${encodeURIComponent(t.otherPersona.id)}`,
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

  async function openItem(item: { id: string; to?: string }) {
    try {
      await store.markNotificationRead(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, unread: false } : i)));
    } catch {
      // ignore
    }
    if (item.to) navigate(item.to);
  }

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

  async function persist(key: string, value: string) {
    try {
      await store.setAgentConfig(key, value);
    } catch (err) {
      console.error('Failed to save notification setting:', err);
    }
  }

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
          <li
            key={item.id}
            className="notification-item"
            style={{
              ...(item.unread ? { borderLeft: '4px solid var(--accent)', background: 'rgba(0,0,0,0.05)' } : {}),
              ...(item.to ? { cursor: 'pointer' } : {}),
            }}
            onClick={() => openItem(item)}
            data-testid={`notif-${item.id}`}
          >
            {item.unread && <b>New: </b>}
            {item.text}
          </li>
        ))}
      </ul>
      <br/>
      <label className="check-label">
        <input type="checkbox" checked={chatOn} onChange={(e) => { setChatOn(e.target.checked); persist('notifications_chat', e.target.checked ? '1' : '0'); }} />
        Chat notifications
      </label>
      <br/>
      <label className="check-label">
        <input type="checkbox" checked={mentionsOn} onChange={(e) => { setMentionsOn(e.target.checked); persist('notifications_mentions', e.target.checked ? '1' : '0'); }} />
        Mention notifications
      </label>
      <br/><br/>
      <div className="field-row">
        <label style={{ flex: 1 }}>
          <span className="meta">Quiet start</span>
          <input
            type="time"
            value={quietStart}
            onChange={(e) => { setQuietStart(e.target.value); persist('quiet_start', e.target.value); }}
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
            onChange={(e) => { setQuietEnd(e.target.value); persist('quiet_end', e.target.value); }}
            className="input-field"
            style={{ marginTop: 4 }}
          />
        </label>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>Quiet hours are stored locally and applied in-app.</p>
    </div>
  );
}
