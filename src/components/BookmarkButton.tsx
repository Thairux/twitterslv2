// Components (Sprint 5). BookmarkButton — toggles bookmark on a post.

import { useEffect, useState } from 'react';
import { useApi } from '../lib/api';

export interface BookmarkButtonProps {
  postId: string;
}

export function BookmarkButton({ postId }: BookmarkButtonProps) {
  const { store } = useApi();
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    async function check() {
      const all = await store.listBookmarks('user');
      setBookmarked(all.some((b) => b.postId === postId));
    }
    check();
  }, [store, postId]);

  const toggle = () => {
    if (bookmarked) {
      store.unbookmark(postId);
      setBookmarked(false);
    } else {
      store.bookmark(postId);
      setBookmarked(true);
    }
  };

  return (
    <button
      className="btn"
      data-testid={`bookmark-btn-${postId}`}
      style={{ fontSize: 10, padding: '2px 8px', ...(bookmarked ? { background: 'var(--accent)', color: 'var(--bg)' } : {}) }}
      onClick={toggle}
    >
      {bookmarked ? '★ Saved' : '☆ Save'}
    </button>
  );
}
