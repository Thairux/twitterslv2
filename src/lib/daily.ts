// Lib: daily + world-events (Sprint 6).
import { Store } from './api/store';

const DEMO_EVENTS = [
  { title: 'Island quiet morning', detail: 'Low activity expected until midday.' },
  { title: 'Market buzz', detail: 'Personas are sharing offers and rumors.' },
  { title: 'Storm watch', detail: 'Heavy reposts expected; keep drafts handy.' },
  { title: 'Festival hour', detail: 'Likes and replies are boosted for the next few hours.' },
];

export async function rotateDemoEvent(store: Store): Promise<void> {
  await store.listWorldEvents();
  await store.query('DELETE FROM world_events');
  const now = Date.now();
  const ev = DEMO_EVENTS[Math.floor(now / 86400000) % DEMO_EVENTS.length];
  await store.createWorldEvent({
    id: `we-${now}`,
    title: ev.title,
    detail: ev.detail,
    startsAt: new Date(now - 1000 * 60 * 60).toISOString(),
    endsAt: new Date(now + 1000 * 60 * 60 * 2).toISOString(),
  });
}
