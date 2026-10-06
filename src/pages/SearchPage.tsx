import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { SocialStore } from '../lib/api/social-store';
import type { DmStore } from '../lib/api/dm-store';
import type { Post } from '../lib/domain/post';
import { extractTags } from '../lib/domain/social';
import { PostCard } from '../components/PostCard';
import { useApi } from '../lib/api';
import { usePersonaNames } from '../lib/api/use-persona-names';
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
  const [suggested, setSuggested] = useState<Array<{ id: string; handle: string; displayName: string; bio?: string }>>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [mediaOnly, setMediaOnly] = useState(false);
  const [fromUser, setFromUser] = useState('');
  const [lastDay, setLastDay] = useState(false);
  const names = usePersonaNames(store);

  async function refreshFollowing() {
    try {
      setFollowing(new Set(await store.listFollowing()));
      setFavorites(new Set(await store.listFavorites()));
    } catch {
      setFollowing(new Set());
      setFavorites(new Set());
    }
  }

  useEffect(() => {
    refreshFollowing();
    // Suggestions: active personas the user doesn't follow yet.
    (async () => {
      try {
        const all = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
        const followed = new Set(await store.listFollowing());
        const open = all.filter((p) => !followed.has(p.id));
        for (let i = open.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [open[i], open[j]] = [open[j], open[i]];
        }
        setSuggested(open.slice(0, 5).map((p) => ({ id: p.id, handle: p.handle, displayName: p.displayName, bio: p.bio })));
      } catch {
        setSuggested([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function toggleFavorite(personaId: string) {
    try {
      await store.toggleFavorite(personaId);
      await refreshFollowing();
    } catch (err) {
      console.error('Favorite failed:', err);
    }
  }

  async function toggleFollow(personaId: string) {
    try {
      if (following.has(personaId)) {
        await store.unfollow(personaId);
      } else {
        await store.follow(personaId);
      }
      await refreshFollowing();
    } catch (err) {
      console.error('Follow failed:', err);
    }
  }

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

  const filteredPosts = posts.filter((p) => {
    if (mediaOnly && !p.imagePath && !p.imageUrl) return false;
    if (fromUser.trim()) {
      const needle = fromUser.trim().toLowerCase().replace(/^@/, '');
      if (p.authorId.toLowerCase() !== needle && (names.get(p.authorId) ?? '').toLowerCase() !== needle) return false;
    }
    if (lastDay && Date.now() - new Date(p.createdAt).getTime() > 24 * 60 * 60 * 1000) return false;
    return true;
  });

  const visiblePersonas = personas.filter((p) => !favoritesOnly || favorites.has(p.id));
  const visibleSuggested = suggested.filter((p) => !favoritesOnly || favorites.has(p.id));

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
          <div className="field-row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
            <label className="check-label" style={{ fontSize: 11 }}>
              <input type="checkbox" checked={mediaOnly} onChange={(e) => { setMediaOnly(e.target.checked); setSearchTrigger((n) => n + 1); }} />
              Media only
            </label>
            <label className="check-label" style={{ fontSize: 11 }}>
              <input type="checkbox" checked={lastDay} onChange={(e) => { setLastDay(e.target.checked); setSearchTrigger((n) => n + 1); }} />
              Last 24h
            </label>
            <input
              type="text"
              value={fromUser}
              onChange={(e) => setFromUser(e.target.value)}
              placeholder="From: handle…"
              className="input-field"
              style={{ flex: '1 1 120px' }}
              data-testid="search-from"
            />
          </div>
          {filteredPosts.map((p) => (
            <PostCard key={p.id} post={p} poll={polls.get(p.id)} authorName={p.authorId === 'user' ? undefined : (names.get(p.authorId) ?? p.authorId)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[p.id]} />
          ))}
          {filteredPosts.length === 0 && query && <p className="meta">No posts found.</p>}
        </div>
      )}

      {tab === 'personas' && (
        <div className="tab-pane active-pane">
          <div className="field-row" style={{ marginBottom: 8 }}>
            <button
              className="btn"
              style={{ fontSize: 11, padding: '4px 8px', ...(favoritesOnly ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
              onClick={() => setFavoritesOnly((v) => !v)}
              data-testid="favorites-filter"
            >
              ★ Favorites{favoritesOnly ? ` (${favorites.size})` : ''}
            </button>
          </div>
          {!query.trim() && visibleSuggested.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p className="meta" style={{ marginBottom: 4 }}>Who to follow</p>
              {visibleSuggested.map((p) => (
                <div key={p.id} className="post" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)} data-testid={`dm-open-${p.id}`}>
                    <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
                    <div className="meta">@{p.handle}{p.bio ? ` — ${p.bio}` : ''}</div>
                  </div>
                  <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
                    <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => toggleFavorite(p.id)} data-testid={`fav-btn-${p.id}`}>
                      {favorites.has(p.id) ? '★' : '☆'}
                    </button>
                    <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => toggleFollow(p.id)} data-testid={`follow-btn-${p.id}`}>
                      {following.has(p.id) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {visiblePersonas.map((p) => (
            <div key={p.id} className="post" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => navigate(`/messages/${encodeURIComponent(p.id)}`)} data-testid={`dm-open-${p.id}`}>
                <div style={{ fontWeight: 'bold' }}>{p.displayName}</div>
                <div className="meta">@{p.handle}</div>
              </div>
              <div className="field-row" style={{ flexShrink: 0, marginTop: 0 }}>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => toggleFavorite(p.id)} data-testid={`fav-btn-${p.id}`}>
                  {favorites.has(p.id) ? '★' : '☆'}
                </button>
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => toggleFollow(p.id)} data-testid={`follow-btn-${p.id}`}>
                  {following.has(p.id) ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>
          ))}
          {visiblePersonas.length === 0 && query && <p className="meta">No personas found.</p>}
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
                <span style={{ fontWeight: 'bold' }}>{d.senderId === 'user' ? 'You' : (names.get(d.senderId) ?? d.senderId)}</span>
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
