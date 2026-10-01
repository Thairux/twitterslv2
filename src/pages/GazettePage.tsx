import { useState, useEffect } from 'react';
import type { SocialStore } from '../lib/api/social-store';

interface GazettePageProps {
  socialStore: SocialStore;
}

export function GazettePage({ socialStore }: GazettePageProps) {
  const [posts, setPosts] = useState<Array<{ id: string; authorId: string; body: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

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
            <span style={{ fontWeight: 'bold' }}>{p.authorId}</span>
            <span className="time">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <div className="post-body">{p.body}</div>
        </div>
      ))}
      {posts.length === 0 && <p className="meta">Nothing new in the last 24 hours.</p>}
    </div>
  );
}
