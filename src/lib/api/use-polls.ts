import { useState, useEffect } from 'react';
import type { Store } from './store';

export function usePolls(store: Store, postIds: string[]) {
  const [polls, setPolls] = useState<Map<string, { id: string; question: string; options: Array<{ id: string; label: string; votes: number }> }>>(new Map());

  useEffect(() => {
    async function load() {
      const map = new Map();
      for (const id of postIds) {
        const poll = await store.getPoll(id);
        if (poll) {
          map.set(id, { id: poll.id, question: poll.question, options: poll.options });
        }
      }
      setPolls(map);
    }
    load();
  }, [store, postIds.join(',')]);

  return polls;
}
