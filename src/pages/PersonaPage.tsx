import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../lib/api';

interface PersonaPost {
  id: string;
  body: string;
  createdAt: string;
}

export function PersonaPage() {
  const { id } = useParams<{ id: string }>();
  const { store } = useApi();
  const [persona, setPersona] = useState<{
    id: string;
    handle: string;
    displayName: string;
    bio: string;
    affinity: number;
  } | null>(null);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [posts, setPosts] = useState<PersonaPost[]>([]);

  const personaId = id ? decodeURIComponent(id) : null;

  useEffect(() => {
    async function load() {
      if (!personaId) return;
      const p = await store.getPersona(personaId);
      if (!p) return;
      setPersona({
        id: p.id,
        handle: p.handle,
        displayName: p.displayName,
        bio: p.bio,
        affinity: p.affinity,
      });
      setFollowing(await store.isFollowing(p.id));
      setMuted(await store.isMuted(p.id));
      setBlocked(await store.isBlocked(p.id));
      const raw = await store.listPosts(p.id);
      setPosts(raw.map((r) => ({ id: r.id, body: r.body, createdAt: r.createdAt })));
    }
    load();
  }, [store, personaId]);

  if (!personaId || !persona) {
    return (
      <div className="content-area">
        <p style={{ color: 'var(--text-dim)' }}>Persona not found.</p>
      </div>
    );
  }

  const handleFollow = async () => {
    if (following) {
      store.unfollow(persona.id);
      setFollowing(false);
    } else {
      store.follow(persona.id);
      setFollowing(true);
    }
  };

  const handleMute = async () => {
    if (muted) {
      store.unmute(persona.id);
      setMuted(false);
    } else {
      store.mute(persona.id);
      setMuted(true);
    }
  };

  const handleBlock = async () => {
    if (blocked) {
      store.unblock(persona.id);
      setBlocked(false);
    } else {
      store.block(persona.id);
      setBlocked(true);
    }
  };

  const handleReport = () => {
    if (!reportReason.trim()) return;
    store.report('persona', persona.id, reportReason.trim());
    setReportSent(true);
    setReportReason('');
  };

  return (
    <div className="content-area">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div className="avatar" style={{ width: 64, height: 64, background: 'var(--accent)', color: 'var(--bg)', fontSize: 28 }}>
          {persona.displayName[0]}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{persona.displayName}</h2>
          <p className="meta">@{persona.handle}</p>
          <p style={{ margin: '4px 0 0', fontSize: 14 }}>{persona.bio}</p>
        </div>
      </div>

      <div className="field-row" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleFollow}>{following ? 'Unfollow' : 'Follow'}</button>
        <button className="btn" onClick={handleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="btn" onClick={handleBlock}>{blocked ? 'Unblock' : 'Block'}</button>
        <Link to={`/messages/${encodeURIComponent(persona.id)}`} className="btn" style={{ fontSize: '12px' }}>
          Message
        </Link>
      </div>

      {!reportSent ? (
        <div style={{ marginBottom: 16 }}>
          <input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Report reason…"
            maxLength={280}
            className="input-field"
            style={{ width: '100%', marginBottom: 8 }}
          />
          <button className="btn" onClick={handleReport} disabled={!reportReason.trim()}>Report</button>
        </div>
      ) : (
        <p className="meta" style={{ marginBottom: 16 }}>Report submitted. Thank you.</p>
      )}

      <h3 style={{ marginBottom: 12 }}>Posts</h3>
      {posts.map((post) => (
        <div key={post.id} className="thread" style={{ marginBottom: 24 }}>
          <div className="text">{post.body}</div>
        </div>
      ))}
      {posts.length === 0 && (
        <p className="meta">No posts yet.</p>
      )}
    </div>
  );
}
