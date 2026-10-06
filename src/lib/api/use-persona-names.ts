// Hook: display-name map for persona ids (single query, shared pattern
// previously copy-pasted in ThreadPage). Falls back to raw ids.

import { useState, useEffect } from 'react';
import type { Store } from './store';

export function usePersonaNames(store: Store): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const personas = await store.listPersonas();
        if (!cancelled) setNames(new Map(personas.map((p) => [p.id, p.displayName])));
      } catch {
        // leave empty; callers fall back to ids
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [store]);

  return names;
}
