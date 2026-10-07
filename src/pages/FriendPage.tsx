import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { ModelClient } from '../lib/api/model-client';
import {
  getInferencePolicy,
  ambientLocalEnabled,
  reportAmbientFailure,
  tryAmbientLocal,
  buildLiveClient,
  type InferenceState,
} from '../lib/api/inference-policy';
import { buildProviderClient } from '../lib/api/providers';
import { OFFLINE_FRIEND_REPLIES } from '../lib/domain/engine';

async function draftFriendReply(
  displayName: string,
  userBody: string,
  store: { getAgentConfig(key: string): Promise<{ key: string; value: string } | null> },
  secrets?: { getProfileApiKey(id: string): Promise<string | null> },
  personaId?: string,
): Promise<{ body: string; via: 'glimmer' | 'offline' }> {
  // Provider chain first (per-persona routing), then global slots —
  // never the stale boot client.
  const fallback = (client: { offlineReply: (p: string[]) => string }) =>
    ({ body: client.offlineReply(OFFLINE_FRIEND_REPLIES), via: 'offline' as const });
  const policy = await getInferencePolicy(store).catch(() => 'strict' as const);
  if (policy === 'offline') return fallback(new ModelClient(''));
  const messages = [
    { role: 'user', content: `You are ${displayName}, a kind friend. Reply briefly (under 140 chars) to: ${userBody}` },
  ];
  const attempts: ModelClient[] = [];
  if (secrets && personaId) {
    try {
      const routed = await buildProviderClient(
        store as never,
        secrets as never,
        'chat',
        personaId,
      );
      if (routed) attempts.push(routed);
    } catch {
      // fall through to global slots
    }
  }
  const slots = await buildLiveClient();
  if (slots) attempts.push(slots);
  if (attempts.length === 0) return fallback(new ModelClient(''));
  let lastErr: unknown = new Error('no endpoint configured');
  let lastState: InferenceState = 'OFFLINE';
  for (const live of attempts) {
    try {
      const body = await live.chat(messages, live.defaultModel ? { model: live.defaultModel } : {});
      return { body, via: 'glimmer' };
    } catch (err) {
      lastErr = err;
      lastState = reportAmbientFailure('friend-chat', err, live);
    }
  }
  if (await ambientLocalEnabled(store).catch(() => false)) {
    const local = await tryAmbientLocal(messages);
    if (local?.text) return { body: local.text, via: 'glimmer' };
  }
  if (policy === 'strict') {
    // Strict: honest labeled diagnostic, never a persona-voice fake.
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr);
    return {
      body: `⚠ model unreachable (${lastState}): ${detail} — open Settings → Validate inference.`,
      via: 'offline',
    };
  }
  return fallback(new ModelClient(''));
}

export function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store, secrets } = useApi();
  const [persona, setPersona] = useState<{ id: string; displayName: string; affinity: number; role: string } | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderId: string; body: string; createdAt: string; replyToId?: string }>>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [replying, setReplying] = useState(false);
  const [seenCursor, setSeenCursor] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Map<string, Array<{ personaId: string; emoji: string }>>>(new Map());
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; senderId: string } | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
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
          role: personaRow.role,
        });
        setMessages(thread);
        try {
          const reacts = await store.listDmReactions(thread.map((m) => m.id));
          const grouped = new Map<string, Array<{ personaId: string; emoji: string }>>();
          for (const r of reacts) {
            const list = grouped.get(r.dmId) ?? [];
            list.push({ personaId: r.personaId, emoji: r.emoji });
            grouped.set(r.dmId, list);
          }
          setReactions(grouped);
        } catch {
          // ignore
        }
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
            const greet = await draftFriendReply(personaRow.displayName, 'Say hello first!', store, secrets, personaRow.id);
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

  const EMOJIS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

  function buzz(pattern: number | number[] = 12) {
    store.getAgentConfig('haptics').then((cfg) => {
      if (cfg?.value === '0') return;
      try {
        (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.(pattern);
      } catch {
        // unsupported — ignore
      }
    }).catch(() => {});
  }

  function speakLast() {
    try {
      const synth = (window as Window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
      if (!synth || !persona) return;
      const last = [...messages].reverse().find((m) => m.senderId !== 'user');
      if (!last) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(last.body);
      const role = persona.role;
      utter.pitch = role === 'friend' ? 1.2 : role === 'troll' ? 0.7 : role === 'meme' ? 1.4 : 1.0;
      utter.rate = role === 'meme' ? 1.15 : 1.0;
      synth.speak(utter);
    } catch {
      // unsupported — ignore
    }
  }

  async function toggleReaction(dmId: string, emoji: string) {
    try {
      await store.toggleDmReaction(dmId, 'user', emoji);
      const reacts = await store.listDmReactions(messages.map((m) => m.id));
      const grouped = new Map<string, Array<{ personaId: string; emoji: string }>>();
      for (const r of reacts) {
        const list = grouped.get(r.dmId) ?? [];
        list.push({ personaId: r.personaId, emoji: r.emoji });
        grouped.set(r.dmId, list);
      }
      setReactions(grouped);
    } catch {
      // ignore
    } finally {
      setReactingTo(null);
    }
  }

  async function handleSend() {
    if (!body.trim() || !threadId || sending) return;
    setSending(true);
    try {
      const dm = {
        id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        threadId,
        senderId: 'user',
        body: body.trim(),
        replyToId: replyTo?.id,
        createdAt: new Date().toISOString(),
        origin: 'glimmer' as const,
      };
      store.createDm(dm);
      setMessages((prev) => [...prev, dm]);
      buzz(12);
      const userBody = body.trim();
      setBody('');
      setReplyTo(null);
      // Friend always replies (endpoint first, offline pool fallback).
      if (persona) {
        setReplying(true);
        try {
          // Human-feeling pause before the reply starts arriving.
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 1400));
          const reply = await draftFriendReply(persona.displayName, userBody, store, secrets, persona.id);
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
  const byId = new Map(messages.map((m) => [m.id, m]));
  const needle = filter.trim().toLowerCase();
  const visible = needle ? messages.filter((m) => m.body.toLowerCase().includes(needle)) : messages;

  return (
    <div className="content-area" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="status-bar">
        <h2 style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{persona.displayName}</h2>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="btn" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={speakLast} data-testid="tts-last" title="Read last message aloud">
            🔊
          </button>
          <div className="meter-box" style={{ width: `${affinityPercent}%` }}>
            Friendship: <b>{affinityPercent}%</b>
          </div>
        </div>
      </div>
      <div className="field-row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search this thread…"
          className="input-field"
          data-testid="thread-search"
        />
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
        {visible.map((m) => {
          const isMe = m.senderId === 'user';
          const seen = isMe && seenCursor && m.createdAt <= seenCursor;
          const quoted = m.replyToId ? byId.get(m.replyToId) : undefined;
          const chips = reactions.get(m.id) ?? [];
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
              {quoted && (
                <div className="meta" style={{ fontSize: 11, opacity: 0.85, borderLeft: '2px solid var(--accent)', paddingLeft: 6, marginBottom: 4 }}>
                  {(quoted.senderId === 'user' ? 'You' : persona.displayName)}: {quoted.body.slice(0, 80)}
                </div>
              )}
              <span onClick={() => setReplyTo({ id: m.id, body: m.body, senderId: m.senderId })} style={{ cursor: 'pointer' }} title="Tap to quote-reply">
                {m.body}
              </span>
              {chips.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 2 }}>{chips.map((c) => c.emoji).join(' ')}</div>
              )}
              <div>
                <button
                  className="btn"
                  style={{ fontSize: 9, padding: '1px 6px', marginTop: 2 }}
                  onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)}
                  data-testid={`react-toggle-${m.id}`}
                >
                  ♥
                </button>
              </div>
              {reactingTo === m.id && (
                <div style={{ marginTop: 4 }}>
                  {EMOJIS.map((e) => (
                    <button key={e} className="btn" style={{ fontSize: 12, padding: '2px 6px' }} onClick={() => toggleReaction(m.id, e)} data-testid={`react-${m.id}-${e}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
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
          placeholder={replyTo ? `Replying to "${replyTo.body.slice(0, 40)}"…` : 'Write a message…'}
          className="input-field"
        />
        <button className="btn" onClick={handleSend} disabled={sending || !body.trim()}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
      {replyTo && (
        <button className="btn" style={{ marginTop: 4, fontSize: 10, padding: '2px 8px' }} onClick={() => setReplyTo(null)} data-testid="reply-cancel">
          × quoting {replyTo.senderId === 'user' ? 'you' : persona.displayName}
        </button>
      )}
    </div>
  );
}
