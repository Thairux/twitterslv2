import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';

export function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store } = useApi();
  const [persona, setPersona] = useState<{ id: string; displayName: string; affinity: number } | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderId: string; body: string; createdAt: string }>>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const personaId = id ? decodeURIComponent(id) : null;
  const threadId = personaId ? `user:${personaId}` : null;

  useEffect(() => {
    async function load() {
      if (!personaId || !threadId) return;
      try {
        const personaRow = await store.getPersona(personaId);
        if (!personaRow) {
          navigate('/dms');
          return;
        }
        const thread = await store.listDms(threadId);
        setPersona({
          id: personaRow.id,
          displayName: personaRow.displayName,
          affinity: personaRow.affinity,
        });
        setMessages(thread);
        store.markDmRead(threadId);
      } catch (e) {
        console.error('Failed to load chat:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [store, personaId, threadId, navigate]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!body.trim() || !threadId || sending) return;
    setSending(true);
    try {
      const dm = {
        id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        threadId,
        senderId: 'user',
        body: body.trim(),
        createdAt: new Date().toISOString(),
        origin: 'glimmer' as const,
      };
      store.createDm(dm);
      setMessages((prev) => [...prev, dm]);
      setBody('');
    } catch (e) {
      console.error('Failed to send:', e);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="content-area">
        <p style={{ color: 'var(--text-dim)' }}>Loading…</p>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="content-area">
        <p style={{ color: 'var(--text-dim)' }}>Persona not found.</p>
      </div>
    );
  }

  const affinityPercent = Math.round(persona.affinity * 100);

  return (
    <div className="content-area" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="status-bar">
        <h2 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{persona.displayName}</h2>
        <div className="meter-box" style={{ width: `${affinityPercent}%` }}>
          Friendship: <b>{affinityPercent}%</b>
        </div>
      </div>
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {messages.map((m) => {
          const isMe = m.senderId === 'user';
          return (
            <div
              key={m.id}
              className="msg"
              style={{
                textAlign: isMe ? 'right' : 'left',
                marginLeft: isMe ? 'auto' : undefined,
                marginRight: isMe ? undefined : 'auto',
              }}
            >
              {m.body}
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="meta" style={{ fontSize: 12 }}>Say hello!</p>
        )}
      </div>
      <div className="field-row">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Write a message…"
          className="input-field"
        />
        <button className="btn" onClick={handleSend} disabled={sending || !body.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
