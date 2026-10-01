import { Store } from './api/store';

export interface WorldEventInput {
  title: string;
  detail: string;
  startsAt: string;
  endsAt: string;
}

export async function seedDemoEvent(store: Store): Promise<void> {
  const existing = await store.listWorldEvents();
  if (existing.length > 0) return;

  await store.createWorldEvent({
    id: `we-${Date.now()}`,
    title: 'Island quiet morning',
    detail: 'Low activity expected until midday.',
    startsAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
  });
}

export async function getActiveEventText(store: Store): Promise<string | null> {
  const now = new Date().toISOString();
  const event = await store.getActiveWorldEvent(now);
  if (!event) return null;
  return `${event.title}: ${event.detail}`;
}
