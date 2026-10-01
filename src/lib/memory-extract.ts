// Lib: memory-extract — approval-gated memory proposals (Sprint 7).

import { Store } from './api/store';

export async function proposeMemory(store: Store, personaId: string, fact: string): Promise<void> {
  const id = `pm-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  store.createPendingMemory({
    id,
    personaId,
    fact,
  });
}

export async function approveMemory(store: Store, pendingId: string): Promise<void> {
  store.approveMemory(pendingId);
}
