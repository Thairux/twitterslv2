import { Link } from 'react-router-dom';
import type { Post } from '../lib/domain/post';
import { BookmarkButton } from './BookmarkButton';
import { LikeButton } from './LikeButton';
import { RepostButton } from './RepostButton';
import { useBlobUrl } from '../lib/api/use-blob-url';
import { useNativeFiles, useApi } from '../lib/api';
import { useEffect, useState } from 'react';
import { extractOpenGraph } from '../lib/api/opengraph';

export interface PostCardProps {
  post: Post;
  poll?: { id: string; question: string; options: Array<{ id: string; label: string; votes: number }> };
  onQuote?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onVote?: (optionId: string) => void;
  voted?: boolean;
  replyCount?: number;
  views?: number;
  /** Display name override — Feed/Search/Gazette pass resolved names. */
  authorName?: string;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function PostCard({ post, poll, onQuote, onEdit, onVote, voted, replyCount, views, authorName }: PostCardProps) {
  const isUser = post.authorId === 'user';
  const name = authorName ?? (isUser ? 'You' : post.authorId);
  const handle = isUser ? '@you' : `@${post.authorId}`;
  const timeLabel = timeAgo(post.createdAt);
  const truncated = post.body.length > 280 ? post.body.slice(0, 277) + '...' : post.body;
  const nativeFiles = useNativeFiles();
  const { socialStore, store } = useApi();
  const mediaUrl = useBlobUrl(nativeFiles, post.imagePath || undefined);
  const remoteUrl = post.imageUrl && /^https?:\/\//.test(post.imageUrl) ? post.imageUrl : undefined;
  const showMedia = mediaUrl || remoteUrl || post.imagePrompt;
  const [ogPreview, setOgPreview] = useState<{ title?: string; description?: string; image?: string; url?: string } | null>(null);
  const [quoted, setQuoted] = useState<Post | null>(null);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<Array<{ id: string; displayName: string; handle: string }>>([]);

  async function toggleLikers() {
    if (!showLikers) {
      try {
        setLikers(await socialStore.listLikers(post.id));
      } catch {
        setLikers([]);
      }
    }
    setShowLikers((prev) => !prev);
  }

  useEffect(() => {
    let cancelled = false;
    async function loadOg() {
      const urlMatch = post.body.match(/https?:\/\/[^\s]+/);
      if (!urlMatch) return;
      try {
        const data = await extractOpenGraph(urlMatch[0]);
        if (!cancelled && data.title) setOgPreview(data);
      } catch {
        // ignore OG fetch failures
      }
    }
    async function loadQuoted() {
      if (!post.quotedPostId) {
        if (!cancelled) setQuoted(null);
        return;
      }
      try {
        const q = await store.getPost(post.quotedPostId);
        if (!cancelled) setQuoted(q);
      } catch {
        // leave null; raw-id fallback below
      }
    }
    loadOg();
    loadQuoted();
    return () => { cancelled = true; };
  }, [post.body, post.quotedPostId, store]);

  return (
    <div className="post">
      <div className="post-header">
        <div
          className="avatar"
          style={{
            width: 24,
            height: 24,
            background: 'linear-gradient(135deg, var(--accent), var(--border))',
            fontSize: 10,
          }}
        >
          {name[0]}
        </div>
        <div>
          <span style={{ fontWeight: 'bold' }}>{name}</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            {' '}{handle}{' '}
          </span>
          <span className="time">{timeLabel}</span>
          {post.aiGenerated && (
            <span style={{ color: 'var(--accent)' }} title="AI Generated">[*]</span>
          )}
        </div>
      </div>
      {ogPreview && (
        <div
          style={{
            marginBottom: 8,
            border: '2px solid var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {ogPreview.image && (
            <img
              src={ogPreview.image}
              alt={ogPreview.title || 'link preview'}
              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
            />
          )}
          <div style={{ padding: 8, background: 'var(--card)' }}>
            <div style={{ fontWeight: 'bold', fontSize: 12 }}>{ogPreview.title}</div>
            {ogPreview.description && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{ogPreview.description}</div>
            )}
            {ogPreview.url && (
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, wordBreak: 'break-all' }}>{ogPreview.url}</div>
            )}
          </div>
        </div>
      )}
      <Link to={`/post/${post.id}`} className="post-body">
        {post.edited && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>[edited] </span>}
        {truncated}
      </Link>
      {showMedia && (
        <div
          style={{
            marginTop: 8,
            border: '3px solid var(--border)',
            borderRadius: 4,
            background: mediaUrl || remoteUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--border))',
            color: 'var(--bg)',
            padding: mediaUrl || remoteUrl ? 0 : 24,
            fontSize: 12,
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: mediaUrl || remoteUrl ? 120 : undefined,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {mediaUrl || remoteUrl ? (
            <img src={mediaUrl ?? remoteUrl} alt={post.imagePrompt || 'post media'} style={{ width: '100%', borderRadius: 4, display: 'block' }} loading="lazy" />
          ) : (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>Image</div>
              <div>{post.imagePrompt ? post.imagePrompt : 'Attached image'}</div>
            </div>
          )}
        </div>
      )}
      {post.quotedPostId && (
        quoted ? (
          <Link
            to={`/post/${quoted.id}`}
            style={{
              marginTop: 8,
              border: '2px solid var(--border)',
              borderRadius: 4,
              padding: 8,
              background: 'rgba(0,0,0,0.05)',
              fontSize: 12,
              display: 'block',
              textDecoration: 'none',
              color: 'var(--text)',
            }}
            data-testid={`quote-card-${post.id}`}
          >
            <div style={{ fontWeight: 'bold' }}>
              {quoted.authorId === 'user' ? 'You' : quoted.authorId}{' '}
              <span className="meta">{timeAgo(quoted.createdAt)}</span>
            </div>
            <div style={{ marginTop: 2 }}>{quoted.body.length > 140 ? `${quoted.body.slice(0, 137)}…` : quoted.body}</div>
          </Link>
        ) : (
          <div
            style={{
              marginTop: 8,
              border: '2px solid var(--border)',
              borderRadius: 4,
              padding: 8,
              background: 'rgba(0,0,0,0.05)',
              fontSize: 12,
            }}
          >
            Quoted post: {post.quotedPostId}
          </div>
        )
      )}
      {poll && (
        <div style={{ marginTop: 8, border: '2px solid var(--border)', borderRadius: 4, padding: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{poll.question}</div>
          {(() => {
            const total = poll.options.reduce((n, o) => n + o.votes, 0);
            return poll.options.map((opt) => (
              <div key={opt.id} style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{opt.label}</span>
                  <span className="meta">{opt.votes}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
                  <div style={{ width: `${total > 0 ? Math.min(100, Math.round((opt.votes / total) * 100)) : 0}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
                {onVote && (
                  <button className="btn" style={{ fontSize: 10, padding: '2px 8px', marginTop: 2 }} onClick={() => onVote(opt.id)} disabled={voted}>{voted ? 'Voted' : 'Vote'}</button>
                )}
              </div>
            ));
          })()}
        </div>
      )}
      <div className="post-actions" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className="btn"
          data-testid={`likers-toggle-${post.id}`}
          style={{ fontSize: 10, padding: '2px 8px' }}
          onClick={toggleLikers}
          title="See who liked this"
        >
          ♥ {likeCount}
        </button>
        <span className="meta">↻ {repostCount}</span>
        {views !== undefined && views > 0 && (
          <span className="meta" data-testid={`views-${post.id}`}>👁 {views}</span>
        )}
        {replyCount !== undefined && (
          <Link to={`/post/${post.id}`} className="meta" data-testid={`reply-count-${post.id}`} style={{ textDecoration: 'none' }}>
            💬 {replyCount}
          </Link>
        )}
        {isUser && onEdit && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => onEdit(post.id)}>Edit</button>
        )}
        {onQuote && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => onQuote(post.id)}>Quote</button>
        )}
        <LikeButton postId={post.id} onChange={(liked) => setLikeCount((n) => n + (liked ? 1 : -1))} />
        <RepostButton postId={post.id} onChange={(reposted) => setRepostCount((n) => n + (reposted ? 1 : -1))} />
        <BookmarkButton postId={post.id} />
      </div>
      {showLikers && (
        <div className="file-item" data-testid={`likers-list-${post.id}`}>
          {likers.length === 0 && <span className="meta">No likes yet.</span>}
          {likers.map((u) => (
            <div key={u.id} className="meta" style={{ marginTop: 2 }}>
              ♥ {u.displayName} <span className="meta">@{u.handle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
