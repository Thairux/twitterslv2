import { Link } from 'react-router-dom';
import type { Post } from '../lib/domain/post';
import { BookmarkButton } from './BookmarkButton';
import { LikeButton } from './LikeButton';
import { RepostButton } from './RepostButton';
import { useBlobUrl } from '../lib/api/use-blob-url';
import { useNativeFiles } from '../lib/api';
import { useEffect, useState } from 'react';
import { extractOpenGraph } from '../lib/api/opengraph';

export interface PostCardProps {
  post: Post;
  poll?: { id: string; question: string; options: Array<{ id: string; label: string; votes: number }> };
  onQuote?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onVote?: (optionId: string) => void;
  voted?: boolean;
}

export function PostCard({ post, poll, onQuote, onEdit, onVote, voted }: PostCardProps) {
  const isUser = post.authorId === 'user';
  const name = isUser ? 'You' : post.authorId;
  const handle = isUser ? '@you' : `@${post.authorId}`;
  const timeLabel = new Date(post.createdAt).toLocaleString();
  const truncated = post.body.length > 280 ? post.body.slice(0, 277) + '...' : post.body;
  const nativeFiles = useNativeFiles();
  const mediaUrl = useBlobUrl(nativeFiles, post.imagePath || undefined);
  const showMedia = mediaUrl || post.imagePrompt;
  const [ogPreview, setOgPreview] = useState<{ title?: string; description?: string; image?: string; url?: string } | null>(null);

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
    loadOg();
    return () => { cancelled = true; };
  }, [post.body]);

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
            background: mediaUrl ? 'transparent' : 'linear-gradient(135deg, var(--accent), var(--border))',
            color: 'var(--bg)',
            padding: mediaUrl ? 0 : 24,
            fontSize: 12,
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: mediaUrl ? 120 : undefined,
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {mediaUrl ? (
            <img src={mediaUrl} alt={post.imagePrompt || 'post media'} style={{ width: '100%', borderRadius: 4, display: 'block' }} />
          ) : (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>Image</div>
              <div>{post.imagePrompt ? post.imagePrompt : 'Attached image'}</div>
            </div>
          )}
        </div>
      )}
      {post.quotedPostId && (
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
      )}
      {poll && (
        <div style={{ marginTop: 8, border: '2px solid var(--border)', borderRadius: 4, padding: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{poll.question}</div>
          {poll.options.map((opt) => (
            <div key={opt.id} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{opt.label}</span>
                <span className="meta">{opt.votes}</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 2 }}>
                <div style={{ width: `${Math.min(100, opt.votes)}%`, height: '100%', background: 'var(--accent)' }} />
              </div>
              {onVote && (
                <button className="btn" style={{ fontSize: 10, padding: '2px 8px', marginTop: 2 }} onClick={() => onVote(opt.id)} disabled={voted}>{voted ? 'Voted' : 'Vote'}</button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="post-actions">
        <span>{post.likes} likes</span>
        <span>{post.reposts} reposts</span>
        {isUser && onEdit && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => onEdit(post.id)}>Edit</button>
        )}
        {onQuote && (
          <button className="btn" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => onQuote(post.id)}>Quote</button>
        )}
        <LikeButton postId={post.id} />
        <RepostButton postId={post.id} />
        <BookmarkButton postId={post.id} />
      </div>
    </div>
  );
}
