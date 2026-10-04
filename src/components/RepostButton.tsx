// Components (Sprint 9). RepostButton — toggles repost on a post.

import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

export interface RepostButtonProps {
  postId: string;
}

export function RepostButton({ postId }: RepostButtonProps) {
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
    setReposted((prev) => !prev);
  };

  return (
    <button onClick={toggle} style={{ fontSize: '12px' }}>
      {reposted ? 'Reposted' : 'Repost'}
    </button>
  );
}
