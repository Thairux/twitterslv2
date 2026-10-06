import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { SocialStore } from '../lib/api/social-store';
import { useApi } from '../lib/api';
import { usePersonaNames } from '../lib/api/use-persona-names';
import { timeAgo } from '../components/PostCard';

interface GazettePageProps {
  socialStore: SocialStore;
}

export function GazettePage({ socialStore }: GazettePageProps) {
  const { store } = useApi();
  const [posts, setPosts] = useState<Array<{ id: string; authorId: string; body: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const names = usePersonaNames(store);

  useEffect(() => {
    async function load() {
      try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const all = await socialStore.rankFeed('user');
        const recent = all.filter((p) => new Date(p.createdAt) >= new Date(oneDayAgo));
        setPosts(recent);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [socialStore]);

  return (
    <div className="content-area">
      <h2 className="page-title">While you were away</h2>
      {loading && <p className="meta">Loading…</p>}
      {posts.map((p) => (
        <div key={p.id} className="post">
          <div className="post-header">
            <span style={{ fontWeight: 'bold' }}>{p.authorId === 'user' ? 'You' : (names.get(p.authorId) ?? p.authorId)}</span>
            <Link to={`/post/${p.id}`} className="time" style={{ textDecoration: 'none' }}>{timeAgo(p.createdAt)}</Link>
          </div>
          <Link to={`/post/${p.id}`} className="post-body">{p.body}</Link>
        </div>
      ))}
      {posts.length === 0 && <p className="meta">Nothing new in the last 24 hours.</p>}
    </div>
  );
}
