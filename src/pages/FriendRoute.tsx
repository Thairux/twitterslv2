// Pages: /friend — resolves the primary friend thread and redirects.
// The primary friend is whoever the user last created/confirmed
// (agent_config primary_friend_id), defaulting to persona-friend (Mimi).

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApi } from '../lib/api';

export function FriendRoute() {
  const { store } = useApi();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const cfg = await store.getAgentConfig('primary_friend_id');
        const id = cfg?.value || 'persona-friend';
        if (!cancelled) setTarget(`/messages/${encodeURIComponent(id)}`);
      } catch {
        if (!cancelled) setTarget('/messages/persona-friend');
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [store]);

  if (!target) {
    return (
      <div className="content-area">
        <p className="meta">Finding your friend…</p>
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
