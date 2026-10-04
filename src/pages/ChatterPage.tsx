import { useState, useEffect } from 'react';
import type { SocialStore } from '../lib/api/social-store';
import type { Post } from '../lib/domain/post';
import { PostCard } from '../components/PostCard';

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
        <PostCard key={p.id} post={p} />
      ))}
      {posts.length === 0 && !loading && <p className="meta">No chatter yet.</p>}
    </div>
  );
}
