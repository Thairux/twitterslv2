// Components (Sprint 9). LikeButton — toggles like on a post.

import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

export interface LikeButtonProps {
  postId: string;
  onChange?: (liked: boolean) => void;
}

export function LikeButton({ postId, onChange }: LikeButtonProps) {
  const { socialStore } = useApi();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const isLiked = await socialStore.isLiked(postId);
      if (!cancelled) setLiked(isLiked);
    }
    check();
    return () => { cancelled = true; };
  }, [socialStore, postId]);

  const toggle = async () => {
    await socialStore.toggleLike(postId);
    setLiked((prev) => {
      onChange?.(!prev);
      return !prev;
    });
  };

  return (
    <button
      className="btn"
      data-testid={`like-btn-${postId}`}
      style={{ fontSize: 10, padding: '2px 8px', ...(liked ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
      onClick={toggle}
    >
      {liked ? '♥ Liked' : '♡ Like'}
    </button>
  );
}
