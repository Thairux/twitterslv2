import { useState } from 'react';
import type { Store } from '../lib/api/store';
import { MAX_POST_LEN } from '../lib/domain/post';

export interface ComposerSheetProps {
  store?: Store;
  onPosted?: () => void;
  replyTo?: string;
}

export function ComposerSheet({ store, onPosted, replyTo }: ComposerSheetProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const charCount = body.length;
  const isOver = charCount > MAX_POST_LEN;
  const isEmpty = !body.trim();

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || isOver || submitting || !store) return;

    setSubmitting(true);
    try {
      store.createPost({
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        authorId: 'user',
        body: trimmed.slice(0, MAX_POST_LEN),
        createdAt: new Date().toISOString(),
        likes: 0,
        reposts: 0,
        origin: 'offline',
        quotedPostId: replyTo,
      });
      if (imagePrompt.trim()) {
        try {
          const { generatePlaceholderImage } = await import('../lib/api/images');
          await generatePlaceholderImage(store, imagePrompt.trim(), 'user');
        } catch {
          // ignore image placeholder failures
        }
      }
      setBody('');
      setImagePrompt('');
      onPosted?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="composer">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's happening?"
        maxLength={MAX_POST_LEN}
      />
      <input
        type="text"
        value={imagePrompt}
        onChange={(e) => setImagePrompt(e.target.value)}
        placeholder="Image prompt (optional)"
        className="input-field"
        style={{ marginTop: 8 }}
      />
      <div className="composer-footer">
        <span className={`char-count ${isOver ? 'warning' : ''}`}>
          {MAX_POST_LEN - charCount}
        </span>
        <button
          className="btn"
          onClick={handleSubmit}
          disabled={isEmpty || isOver || submitting || !store}
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
