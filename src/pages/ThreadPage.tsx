import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import type { Post, Reply } from '../lib/domain/post';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { socialStore, store } = useApi();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const thread = await socialStore.getThread(id);
        setPost(thread.post);
        setReplies(thread.replies);
      } catch (err) {
        console.error('Failed to load thread:', err);
      }
    }
    load();
  }, [id, socialStore]);

  if (!id) {
    return <div className="content-area"><p>Missing post id.</p></div>;
  }

  if (!post && !replies.length) {
    return <div className="content-area"><p>Post not found.</p></div>;
  }

  const handleQuote = (postId: string) => {
    navigate(`/compose?quote=${encodeURIComponent(postId)}`);
  };

  const polls = usePolls(store, post ? [post.id] : []);
  const pollVotes = usePollVotes(store, post ? [post.id] : []);

  return (
    <div className="content-area">
      {post && (
        <PostCard post={post} poll={polls.get(post.id)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[post.id]} />
      )}
      <div className="thread-line" style={{ margin: '0 0 0 24px', minHeight: 24 }} />
      {replies.map((r) => (
        <div key={r.id} className="post" style={{ marginLeft: 24 }}>
          <div className="post-header">
            <span style={{ fontWeight: 'bold' }}>{r.authorId}</span>
            <span className="time">{new Date(r.createdAt).toLocaleString()}</span>
          </div>
          <div className="post-body">{r.body}</div>
        </div>
      ))}
    </div>
  );
}
