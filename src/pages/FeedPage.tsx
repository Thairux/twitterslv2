import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { StoriesStrip, type StoryItem } from '../components/StoriesStrip';
import type { Post } from '../lib/domain/post';
import { getActiveEventText } from '../lib/world-events';
import { rotateDemoEvent } from '../lib/daily';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';
import { usePersonaNames } from '../lib/api/use-persona-names';

export function FeedPage() {
  const { socialStore, store } = useApi();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [eventText, setEventText] = useState<string | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(30);
  const pullStartY = useRef<number | null>(null);
  const lastRotatedRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const feed = tab === 'foryou' ? await socialStore.rankFeed('user') : await socialStore.listFeedFollowing('user');
        if (cancelled) return;
        setPosts(feed);
        try {
          const counts = await socialStore.getReplyCounts();
          if (!cancelled) setReplyCounts(counts);
        } catch {
          // counts are decorative; feed still renders
        }
        try {
          const views = await store.getPostViewCounts();
          if (!cancelled) setViewCounts(views);
        } catch {
          // ignore
        }
        const text = await getActiveEventText(store);
        if (cancelled) return;
        setEventText(text);
        try {
          const rows = await store.listActiveStories();
          if (cancelled) return;
          const personas = await store.listPersonas().catch(() => []);
          const byId = new Map(personas.map((p) => [p.id, p]));
          const seenBy = new Map<string, boolean>();
          await Promise.all(
            rows.map(async (r) => {
              try {
                const viewers = await store.listStoryViews(r.id);
                seenBy.set(r.id, viewers.includes('user'));
              } catch {
                seenBy.set(r.id, false);
              }
            }),
          );
          if (cancelled) return;
          setStories(
            rows.map((r) => ({
              id: r.id,
              authorId: r.authorId,
              displayName: r.authorId === 'user' ? 'You' : (byId.get(r.authorId)?.displayName ?? r.authorId),
              avatarSeed: byId.get(r.authorId)?.avatarSeed ?? r.authorId,
              body: r.body,
              imagePath: r.imagePath,
              createdAt: r.createdAt,
              seen: seenBy.get(r.id) ?? false,
            })),
          );
        } catch {
          // stories are decorative; feed still renders
        }
        const now = Date.now();
        if (now - lastRotatedRef.current > 60_000) {
          lastRotatedRef.current = now;
          rotateDemoEvent(store).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load feed:', err);
      }
    }
    load();
    // Live island: re-read so ambient posts, replies counts, and likes
    // appear without leaving the screen.
    const timer = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [socialStore, store, tab]);

  const handleQuote = (postId: string) => {
    navigate(`/compose?quote=${encodeURIComponent(postId)}`);
  };

  const polls = usePolls(store, posts.map((p) => p.id));
  const pollVotes = usePollVotes(store, posts.map((p) => p.id));
  const names = usePersonaNames(store);

  return (
    <div
      className="content-area"
      onTouchStart={(e) => {
        pullStartY.current = e.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(e) => {
        const start = pullStartY.current;
        pullStartY.current = null;
        if (start === null) return;
        const end = e.changedTouches[0]?.clientY ?? start;
        if (end - start > 90 && window.scrollY <= 0) {
          setVisibleCount(30);
          socialStore.rankFeed('user').then(setPosts).catch(() => {});
        }
      }}
    >
      {eventText && (
        <div className="notification-item" style={{ marginBottom: 12 }}>
          {eventText}
        </div>
      )}
      <div className="feed-tabs">
        <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>For You</button>
        <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
      </div>
      <StoriesStrip store={store} stories={stories} onChanged={(id) => setStories((prev) => prev.map((s) => (s.id === id ? { ...s, seen: true } : s)))} />
      {posts.slice(0, visibleCount).map((post) => (
        <PostCard key={post.id} post={post} poll={polls.get(post.id)} authorName={post.authorId === 'user' ? undefined : (names.get(post.authorId) ?? post.authorId)} replyCount={replyCounts[post.id] ?? 0} views={viewCounts[post.id] ?? 0} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[post.id]} />
      ))}
      {posts.length > visibleCount && (
        <button className="btn" style={{ marginTop: 8 }} onClick={() => setVisibleCount((n) => n + 30)} data-testid="feed-more">
          Load more ({posts.length - visibleCount} remaining)
        </button>
      )}
      {posts.length === 0 && (
        <p className="meta" data-testid="feed-empty">
          No posts yet. Be the first to post, or visit Settings → Background Simulation for a friend ping.
        </p>
      )}
      <Link to="/compose" className="fab" aria-label="Compose post" data-testid="compose-fab">+</Link>
    </div>
  );
}
