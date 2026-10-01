import { useState, useEffect } from 'react';
import type { SocialStore } from '../lib/api/social-store';
import type { Post } from '../lib/domain/post';

interface ChatterPageProps {
  socialStore: SocialStore;
}

export function ChatterPage({ socialStore }: ChatterPageProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const feed = await socialStore.rankFeed('user');
        setPosts(feed);
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
      <h2 className="page-title">Chatter</h2>
      {loading && <p className="meta">Loading…</p>}
      {posts.map((p) => (
        <div key={p.id} className="post">
          <div className="post-header">
            <span style={{ fontWeight: 'bold' }}>{p.authorId}</span>
            <span className="time">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <div className="post-body">{p.body}</div>
          <div className="post-actions">
            <span>{p.likes} likes</span>
            <span>{p.reposts} reposts</span>
          </div>
        </div>
      ))}
      {posts.length === 0 && <p className="meta">No chatter yet.</p>}
    </div>
  );
}
