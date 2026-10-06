import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../lib/api';
import { PostCard } from '../components/PostCard';
import { LikeButton } from '../components/LikeButton';
import type { Post, Reply } from '../lib/domain/post';
import { usePolls } from '../lib/api/use-polls';
import { usePollVotes } from '../lib/api/use-poll-votes';

export function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { socialStore, store } = useApi();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyParent, setReplyParent] = useState<{ id: string; name: string } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newestFirst, setNewestFirst] = useState(false);

  async function reloadThread() {
    if (!id) return;
    try {
      const thread = await socialStore.getThread(id);
      setPost(thread.post);
      setReplies(thread.replies);
      try {
        await store.recordPostView(id);
      } catch {
        // views are best-effort
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    }
  }

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const thread = await socialStore.getThread(id);
        setPost(thread.post);
        setReplies(thread.replies);
        try {
          const personas = await store.listPersonas();
          setNames(new Map(personas.map((p) => [p.id, p.displayName])));
        } catch {
          // names stay empty; author ids render as fallback
        }
        try {
          await store.recordPostView(id);
        } catch {
          // views are best-effort
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
      }
    }
    load();
  }, [id, socialStore]);

  async function handleReply() {
    const trimmed = replyBody.trim();
    if (!trimmed || !post || replying) return;
    setReplying(true);
    try {
      await store.createReply({
        id: `r-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        postId: post.id,
        authorId: 'user',
        body: trimmed.slice(0, 280),
        replyOrder: replies.length,
        parentReplyId: replyParent?.id,
        origin: 'offline',
        createdAt: new Date().toISOString(),
      });
      setReplyBody('');
      setReplyParent(null);
      await reloadThread();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setReplying(false);
    }
  }

  // Hooks must run before any early return (hook-count stability).
  const polls = usePolls(store, post && id ? [post.id] : []);
  const pollVotes = usePollVotes(store, post && id ? [post.id] : []);

  if (!id) {
    return <div className="content-area"><p>Missing post id.</p></div>;
  }

  const handleQuote = (postId: string) => {
    navigate(`/compose?quote=${encodeURIComponent(postId)}`);
  };

  // One nesting level, X-style: children attach to top-level replies;
  // deeper replies flatten to the top-level ancestor.
  const byId = new Map(replies.map((r) => [r.id, r]));
  function topAncestor(r: Reply): Reply {
    let cur = r;
    const seen = new Set<string>([cur.id]);
    while (cur.parentReplyId && byId.has(cur.parentReplyId) && !seen.has(cur.parentReplyId)) {
      seen.add(cur.parentReplyId);
      cur = byId.get(cur.parentReplyId)!;
    }
    return cur;
  }
  const topLevel = replies.filter((r) => topAncestor(r).id === r.id);
  const orderedTop = [...topLevel].sort((a, b) =>
    newestFirst ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
  );
  function childrenOf(parentId: string): Reply[] {
    return replies.filter((r) => r.id !== parentId && topAncestor(r).id === parentId);
  }
  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!post && !replies.length) {
    return <div className="content-area"><p>Post not found.</p></div>;
  }

  return (
    <div className="content-area">
      {post && (
        <PostCard post={post} poll={polls.get(post.id)} authorName={post.authorId === 'user' ? undefined : (names.get(post.authorId) ?? post.authorId)} onQuote={handleQuote} onVote={async (optionId) => { try { await store.votePoll(optionId); } catch (err) { console.error('Vote failed:', err); } }} voted={pollVotes[post.id]} />
      )}
      <div className="thread-line" style={{ margin: '0 0 0 24px', minHeight: 24 }} />
      <div className="field-row" style={{ marginLeft: 24, marginBottom: 12 }}>
        <input
          type="text"
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); }}
          placeholder={replyParent ? `Reply to ${replyParent.name}…` : 'Write a comment…'}
          className="input-field"
          data-testid="reply-input"
        />
        <button className="btn" onClick={handleReply} disabled={replying || !replyBody.trim()} data-testid="reply-send">
          {replying ? '…' : 'Reply'}
        </button>
        {replyParent && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setReplyParent(null)} data-testid="reply-cancel-parent">
            × {replyParent.name}
          </button>
        )}
      </div>
      {topLevel.length > 1 && (
        <div className="field-row" style={{ marginLeft: 24, marginBottom: 8 }}>
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setNewestFirst((v) => !v)} data-testid="thread-sort">
            {newestFirst ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      )}
      {orderedTop.map((r) => {
        const kids = childrenOf(r.id);
        const isCollapsed = collapsed.has(r.id);
        return (
          <div key={r.id}>
            <div className="post" style={{ marginLeft: 24 }} data-testid={`reply-${r.id}`}>
              <div className="post-header">
                <span style={{ fontWeight: 'bold' }}>{names.get(r.authorId) ?? r.authorId}</span>
                <span className="time">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <div className="post-body">{r.body}</div>
              <div className="post-actions" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn"
                  style={{ fontSize: 10, padding: '2px 8px' }}
                  onClick={() => setReplyParent({ id: r.id, name: names.get(r.authorId) ?? r.authorId })}
                  data-testid={`reply-to-${r.id}`}
                >
                  Reply
                </button>
                <LikeButton postId={r.id} />
                {kids.length > 0 && (
                  <button
                    className="btn"
                    style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => toggleCollapse(r.id)}
                    data-testid={`collapse-${r.id}`}
                  >
                    {isCollapsed ? `＋ ${kids.length}` : `－ ${kids.length}`}
                  </button>
                )}
              </div>
            </div>
            {!isCollapsed && kids.map((k) => {
              const directParent = (k.parentReplyId && byId.get(k.parentReplyId)) || r;
              return (
                <div key={k.id} className="post" style={{ marginLeft: 48, borderStyle: 'dashed' }} data-testid={`reply-${k.id}`}>
                  <div className="post-header">
                    <span style={{ fontWeight: 'bold' }}>{names.get(k.authorId) ?? k.authorId}</span>
                    <span className="meta">→ {names.get(directParent.authorId) ?? directParent.authorId}</span>
                    <span className="time">{new Date(k.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="post-body">{k.body}</div>
                  <div className="post-actions" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn"
                      style={{ fontSize: 10, padding: '2px 8px' }}
                      onClick={() => setReplyParent({ id: k.id, name: names.get(k.authorId) ?? k.authorId })}
                      data-testid={`reply-to-${k.id}`}
                    >
                      Reply
                    </button>
                    <LikeButton postId={k.id} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
