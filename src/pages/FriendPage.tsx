import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { ModelClient } from '../lib/api/model-client';
import { getSelectedModel, getModelEndpoint, getApiKey, refreshConfig } from '../lib/config';
import { OFFLINE_FRIEND_REPLIES } from '../lib/domain/engine';

async function draftFriendReply(
  displayName: string,
  userBody: string,
): Promise<{ body: string; via: 'glimmer' | 'offline' }> {
  // Build a live client from stored settings — never the stale boot client.
  const fallback = (client: { offlineReply: (p: string[]) => string }) =>
    ({ body: client.offlineReply(OFFLINE_FRIEND_REPLIES), via: 'offline' as const });
  try {
    await refreshConfig();
    const endpoint = (await getModelEndpoint()).trim();
    if (!endpoint) throw new Error('no endpoint configured');
    const key = await getApiKey();
    const model = (await getSelectedModel()) ?? undefined;
    const live = new ModelClient(endpoint, key ?? undefined);
    const body = await live.chat(
      [{ role: 'user', content: `You are ${displayName}, a kind friend. Reply briefly (under 140 chars) to: ${userBody}` }],
      model ? { model } : {},
    );
    return { body, via: 'glimmer' };
  } catch {
    return fallback(new ModelClient(''));
  }
}

export function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store } = useApi();
  const [persona, setPersona] = useState<{ id: string; displayName: string; affinity: number } | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderId: string; body: string; createdAt: string }>>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);
  const [seenCursor, setSeenCursor] = useState<string | null>(null);
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
        try {
          const seen = await store.getAgentConfig(`seen:${threadId}`);
          if (seen) setSeenCursor(seen.value);
        } catch {
          // ignore
        }
        // Friend is always first to greet: on an empty thread, send one
        // greeting (once per browser session) so the chat never sits silent.
        if (thread.length === 0) {
          const greetedKey = `tsl-greeted-${threadId}`;
          if (!sessionStorage.getItem(greetedKey)) {
            sessionStorage.setItem(greetedKey, '1');
            const greet = await draftFriendReply(personaRow.displayName, 'Say hello first!');
            const hello = {
              id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              threadId,
              senderId: personaRow.id,
              body: greet.body,
              createdAt: new Date().toISOString(),
              origin: greet.via,
            } as const;
            store.createDm(hello);
            setMessages([hello]);
          }
        }
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
      const userBody = body.trim();
      setBody('');
      // Friend always replies (endpoint first, offline pool fallback).
      if (persona) {
        setReplying(true);
        try {
          // Human-feeling pause before the reply starts arriving.
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 1400));
          const reply = await draftFriendReply(persona.displayName, userBody);
          const answer = {
            id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            threadId,
            senderId: persona.id,
            body: reply.body,
            createdAt: new Date().toISOString(),
            origin: reply.via,
          } as const;
          store.createDm(answer);
          setMessages((prev) => [...prev, answer]);
          // Honest local receipt: the friend saw everything up to your message.
          try {
            await store.setAgentConfig(`seen:${threadId}`, dm.createdAt);
          } catch {
            // ignore
          }
          setSeenCursor(dm.createdAt);
        } finally {
          setReplying(false);
        }
      }
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
          const seen = isMe && seenCursor && m.createdAt <= seenCursor;
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
              {seen && <div className="meta" style={{ fontSize: 10 }}>Seen</div>}
            </div>
          );
        })}
        {messages.length === 0 && !replying && (
          <p className="meta" style={{ fontSize: 12 }}>Say hello!</p>
        )}
        {replying && (
          <p className="meta" style={{ fontSize: 12 }}>Friend is typing…</p>
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
