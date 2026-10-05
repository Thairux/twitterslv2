import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import type { Post } from '../lib/domain/post';
import { getActiveEventText } from '../lib/world-events';
import { rotateDemoEvent } from '../lib/daily';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

export function FeedPage() {
  const { socialStore, store } = useApi();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [eventText, setEventText] = useState<string | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
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
        const text = await getActiveEventText(store);
        if (cancelled) return;
        setEventText(text);
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

  return (
    <div className="content-area">
      {eventText && (
        <div className="notification-item" style={{ marginBottom: 12 }}>
          {eventText}
        </div>
      )}
      <div className="feed-tabs">
        <button className={tab === 'foryou' ? 'active' : ''} onClick={() => setTab('foryou')}>For You</button>
        <button className={tab === 'following' ? 'active' : ''} onClick={() => setTab('following')}>Following</button>
      </div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} poll={polls.get(post.id)} replyCount={replyCounts[post.id] ?? 0} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[post.id]} />
      ))}
      {posts.length === 0 && (
        <p className="meta" data-testid="feed-empty">
          No posts yet. Be the first to post, or visit Settings → Background Simulation for a friend ping.
        </p>
      )}
      <Link to="/compose" className="fab" aria-label="Compose post" data-testid="compose-fab">+</Link>
    </div>
  );
}
