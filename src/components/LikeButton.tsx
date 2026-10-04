// Components (Sprint 9). LikeButton — toggles like on a post.

import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

export interface LikeButtonProps {
  postId: string;
}

export function LikeButton({ postId }: LikeButtonProps) {
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
    setLiked((prev) => !prev);
  };

  return (
    <button onClick={toggle} style={{ fontSize: '12px' }}>
      {liked ? 'Liked' : 'Like'}
    </button>
  );
}
