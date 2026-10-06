import { useState, useEffect } from 'react';
import type { SocialStore } from '../lib/api/social-store';
import type { Post } from '../lib/domain/post';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';

interface ChatterPageProps {
  socialStore: SocialStore;
}

export function ChatterPage({ socialStore }: ChatterPageProps) {
  const { store } = useApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const feed = await socialStore.rankFeed('user');
        setPosts(feed);
        try {
          const personas = await store.listPersonas();
          setNames(new Map(personas.map((p) => [p.id, p.displayName])));
        } catch {
          // names stay empty; author ids render as fallback
        }
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [socialStore, store]);

  return (
    <div className="content-area">
      <h2 className="page-title">Chatter</h2>
      {loading && <p className="meta">Loading…</p>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} authorName={p.authorId === 'user' ? undefined : (names.get(p.authorId) ?? p.authorId)} />
      ))}
      {posts.length === 0 && !loading && <p className="meta">No chatter yet.</p>}
    </div>
  );
}
