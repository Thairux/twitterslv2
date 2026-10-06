import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import type { Post } from '../lib/domain/post';

export function PersonaPage() {
  const { id } = useParams<{ id: string }>();
  const { store, socialStore } = useApi();
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [favorite, setFavorite] = useState(false);

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
      setPosts(raw);
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
    try {
      if (following) {
        await store.unfollow(persona.id);
        setFollowing(false);
      } else {
        await store.follow(persona.id);
        setFollowing(true);
      }
    } catch (err) {
      console.error('Follow failed:', err);
    }
  };

  const handleMute = async () => {
    try {
      if (muted) {
        await store.unmute(persona.id);
        setMuted(false);
      } else {
        await store.mute(persona.id);
        setMuted(true);
      }
    } catch (err) {
      console.error('Mute failed:', err);
    }
  };

  useEffect(() => {
    async function loadFavorite() {
      try {
        const pid = persona?.id;
        if (pid) setFavorite(await store.isFavorite(pid));
      } catch {
        // ignore
      }
    }
    if (personaId) loadFavorite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, personaId]);

  async function toggleFavorite() {
    const pid = persona?.id;
    if (!pid) return;
    try {
      setFavorite(await store.toggleFavorite(pid));
    } catch (err) {
      console.error('Favorite failed:', err);
    }
  }

  const handleBlock = async () => {
    const pid = persona?.id;
    if (!pid) return;
    if (!blocked && !confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    try {
      if (blocked) {
        await store.unblock(pid);
        setBlocked(false);
      } else {
        await socialStore.blockPersona(pid);
        setBlocked(true);
        setFollowing(false);
      }
    } catch (err) {
      console.error('Block failed:', err);
    } finally {
      setConfirmingBlock(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await store.report('persona', persona.id, reportReason.trim());
      setReportSent(true);
      setReportReason('');
    } catch (err) {
      console.error('Report failed:', err);
    }
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
        <button
          className="btn"
          onClick={toggleFavorite}
          data-testid={`persona-fav-${persona.id}`}
          style={favorite ? { background: 'var(--accent)', color: 'var(--bg)' } : undefined}
        >
          {favorite ? '★ Faved' : '☆ Fav'}
        </button>
        <button className="btn" onClick={handleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <button className="btn" onClick={handleBlock}>
          {blocked ? 'Unblock' : confirmingBlock ? 'Sure?' : 'Block'}
        </button>
        <Link to={`/messages/${encodeURIComponent(persona.id)}`} className="btn" style={{ fontSize: '12px' }}>
          Message
        </Link>
      </div>
      {confirmingBlock && !blocked && (
        <p className="meta" style={{ marginBottom: 8 }}>Blocking also unfollows and removes them as a follower. Tap Block again to confirm.</p>
      )}

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
        <PostCard key={post.id} post={post} authorName={persona.displayName} />
      ))}
      {posts.length === 0 && (
        <p className="meta">No posts yet.</p>
      )}
    </div>
  );
}
