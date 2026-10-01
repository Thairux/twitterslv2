import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SocialStore } from '../lib/api/social-store';
import type { DmStore } from '../lib/api/dm-store';
import type { Post } from '../lib/domain/post';
import { extractTags } from '../lib/domain/social';
import { PostCard } from '../components/PostCard';
import { useApi } from '../lib/api';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

interface SearchPageProps {
  socialStore: SocialStore;
  dmStore: DmStore;
}

type SearchTab = 'posts' | 'personas' | 'tags' | 'dms';

export function SearchPage({ socialStore, dmStore }: SearchPageProps) {
  const { store } = useApi();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SearchTab | null) ?? 'posts';
  const safeInitialTab: SearchTab = ['posts', 'personas', 'tags', 'dms'].includes(initialTab) ? initialTab : 'posts';
  const [tab, setTab] = useState<SearchTab>(safeInitialTab);
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [personas, setPersonas] = useState<Array<{ id: string; handle: string; displayName: string }>>([]);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [dms, setDms] = useState<Array<{ id: string; threadId: string; senderId: string; body: string; createdAt: string }>>([]);
  const [searchTrigger, setSearchTrigger] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const q = query.trim();
        if (!q) {
          setPosts([]);
          setPersonas([]);
          setTags([]);
          setDms([]);
          return;
        }
        if (tab === 'posts' || tab === 'tags') {
          const results = await socialStore.searchPosts(q);
          setPosts(results);
          if (tab === 'tags') {
            const counts = new Map<string, number>();
            for (const p of results) {
              for (const t of extractTags(p.body)) {
                counts.set(t, (counts.get(t) ?? 0) + 1);
              }
            }
            setTags(
              [...counts.entries()]
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 20),
            );
          }
        }
        if (tab === 'personas') {
          const results = await socialStore.searchPersonas(q);
          setPersonas(results.map((p) => ({ id: p.id, handle: p.handle, displayName: p.displayName })));
        }
        if (tab === 'dms') {
          const results = await dmStore.searchDms(q);
          setDms(results);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, tab, searchTrigger, socialStore, dmStore]);

  const handleQuote = (postId: string) => {
    navigate(`/compose?quote=${encodeURIComponent(postId)}`);
  };

  const polls = usePolls(store, posts.map((p) => p.id));
  const pollVotes = usePollVotes(store, posts.map((p) => p.id));

  return (
    <div className="content-area">
      <h2 className="page-title">Search</h2>
      <div className="field-row" style={{ marginBottom: 16 }}>
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="input-field"
        />
        <button className="btn" onClick={() => setSearchTrigger((n) => n + 1)}>Go</button>
      </div>
      <div className="feed-tabs">
        {(['posts', 'personas', 'tags', 'dms'] as SearchTab[]).map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <div className="tab-pane active-pane">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} poll={polls.get(p.id)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[p.id]} />
          ))}
          {posts.length === 0 && query && <p className="meta">No posts found.</p>}
        </div>
      )}

      {tab === 'personas' && (
        <div className="tab-pane active-pane">
          {personas.map((p) => (
            <div key={p.id} className="post">
              <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
              <div className="meta">@{p.handle}</div>
            </div>
          ))}
          {personas.length === 0 && query && <p className="meta">No personas found.</p>}
        </div>
      )}

      {tab === 'tags' && (
        <div className="tab-pane active-pane">
          {tags.length === 0 && query && <p className="meta">No tags found.</p>}
          {tags.map((t) => (
            <div key={t.tag} className="post">
              <div className="post-body">
                <b>{t.tag}</b> <span className="meta">{t.count}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'dms' && (
        <div className="tab-pane active-pane">
          {dms.length === 0 && query && <p className="meta">No DMs found.</p>}
          {dms.map((d) => (
            <div key={d.id} className="post">
              <div className="post-header">
                <span style={{ fontWeight: 'bold' }}>{d.senderId}</span>
                <span className="time">{new Date(d.createdAt).toLocaleString()}</span>
              </div>
              <div className="post-body">{d.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
