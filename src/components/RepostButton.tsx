// Components (Sprint 9). RepostButton — toggles repost on a post.

import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

export interface RepostButtonProps {
  postId: string;
  onChange?: (reposted: boolean) => void;
}

export function RepostButton({ postId, onChange }: RepostButtonProps) {
  const { socialStore } = useApi();
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const isReposted = await socialStore.isReposted(postId);
      if (!cancelled) setReposted(isReposted);
    }
    check();
    return () => { cancelled = true; };
  }, [socialStore, postId]);

  const toggle = async () => {
    await socialStore.toggleRepost(postId);
    setReposted((prev) => {
      onChange?.(!prev);
      return !prev;
    });
  };

  return (
    <button
      className="btn"
      data-testid={`repost-btn-${postId}`}
      style={{ fontSize: 10, padding: '2px 8px', ...(reposted ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
      onClick={toggle}
    >
      {reposted ? '↻ Reposted' : '↻ Repost'}
    </button>
  );
}
