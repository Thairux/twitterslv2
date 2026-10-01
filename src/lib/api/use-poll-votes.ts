import { useState, useEffect } from 'react';
import type { Store } from './store';

export function usePollVotes(store: Store, pollIds: string[]) {
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const map: Record<string, boolean> = {};
      for (const id of pollIds) {
        map[id] = await store.hasVoted(id);
      }
      setVoted(map);
    }
    load();
  }, [store, pollIds.join(',')]);

  return voted;
}
