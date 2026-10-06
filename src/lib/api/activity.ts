// API: activity — island liveliness engine (app layer).
// Personas post, reply (friend-first), like, and DM the user on timers so
// every user post gets responses within seconds and the feed never sits
// dead. All output degrades to offline pools when no endpoint is reachable.

import type { Store } from './store';
import type { SocialStore } from './social-store';
import type { DmStore } from './dm-store';
import { ModelClient } from './model-client';
import { replyToUserPost } from '../sim-engine';
import { ambientTick as chatterPostTick, personaToPersonaDms } from '../chatter';
import { refreshConfig, getModelEndpoint, getApiKey, getSelectedModel } from '../config';
import { noteAmbientFallback, noteAmbientLive } from './ambient-status';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES } from '../domain/engine';

export type Scheduler = (delayMs: number, fn: () => void | Promise<void>) => void;

const defaultSchedule: Scheduler = (delayMs, fn) => {
  setTimeout(() => {
    try {
      const r = fn();
      if (r instanceof Promise) r.catch(() => {});
    } catch {
      // ambient work must never crash the app
    }
  }, delayMs);
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueReplyId(postId: string, authorId: string): string {
  return `r-${postId}-${authorId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Prefer the passed client, but fall back to a freshly resolved one: the
 * boot-time client goes stale the moment the user edits endpoint/key/model.
 */
export async function resolveAmbientClient(_preferred?: ModelClient): Promise<ModelClient | undefined> {
  // NOTE: the preferred (usually boot-time) client is deliberately NOT
  // trusted: it may carry an endpoint with a stale-empty key, which 401s
  // every ambient call into offline pools while manual test chats (built
  // live from field values) succeed. Always re-resolve from storage.
  try {
    await refreshConfig();
    const endpoint = (await getModelEndpoint()).trim();
    if (!endpoint) return undefined;
    const key = await getApiKey();
    const model = await getSelectedModel();
    return new ModelClient(endpoint, key ?? undefined, model ? { defaultModel: model } : {});
  } catch {
    return undefined;
  }
}

/**
 * Answer a post within seconds: friend replies first, then crowd replies,
 * then a shower of likes. Fire-and-forget; every step is individually
 * try-caught so one failure never blocks the rest.
 */
export function respondToPost(
  socialStore: Pick<SocialStore, 'toggleLike' | 'isLiked'>,
  store: Pick<Store, 'listPersonas' | 'createReply' | 'listReplies'>,
  client: ModelClient | undefined,
  postId: string,
  body: string,
  schedule: Scheduler = defaultSchedule,
): void {
  const run = async () => {
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return;
    const live = await resolveAmbientClient(client);
    const crowd = personas.map((p) => ({ id: p.id, displayName: p.displayName, handle: p.handle, vibe: p.vibe, role: p.role }));
    const replies = await replyToUserPost(postId, body, crowd, live ? { modelClient: live } : {});
    // Friend first (fast), crowd staggered after.
    replies.forEach((reply, idx) => {
      const delayMs = idx === 0 ? 1200 : 2500 + idx * 1800;
      schedule(delayMs, async () => {
        try {
          await store.createReply({ ...reply, id: uniqueReplyId(postId, reply.authorId) });
        } catch {
          // duplicate or DB hiccup — skip
        }
      });
    });
    // Likes rain in a few seconds after the replies start.
    const likers = shuffle(personas).slice(0, 2 + Math.floor(Math.random() * 4));
    likers.forEach((persona, idx) => {
      schedule(3500 + idx * 1500, async () => {
        try {
          if (!(await socialStore.isLiked(postId, persona.id))) {
            await socialStore.toggleLike(postId, persona.id);
          }
        } catch {
          // ambient work must never surface errors
        }
      });
    });
  };
  run().catch(() => {});
}

/** One ambient beat: fresh persona posts, replies + likes on recent posts. */
export async function ambientBeat(
  store: Store,
  socialStore: SocialStore,
  client: ModelClient | undefined,
  schedule: Scheduler = defaultSchedule,
): Promise<{ posts: number; replies: number; likes: number }> {
  const summary = { posts: 0, replies: 0, likes: 0 };
  const live = await resolveAmbientClient(client);
  try {
    await chatterPostTick(store, live);
    summary.posts += 1;
  } catch {
    // posting failed — still try interactions below
  }
  // Personas also DM each other (agent threads stay out of your inbox,
  // which stays yours alone — but the island talks behind the scenes).
  if (Math.random() < 0.3) {
    try {
      await personaToPersonaDms(store, live);
    } catch {
      // ignore
    }
  }
  try {
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return summary;
    const feed = await socialStore.rankFeed('user');
    const targets = feed.slice(0, 3);
    for (const post of targets) {
      const others = shuffle(personas.filter((p) => p.id !== post.authorId)).slice(0, 2);
      const existing = await store.listReplies(post.id);
      for (const [i, persona] of others.entries()) {
        const delayMs = 2000 + i * 2500 + Math.floor(Math.random() * 1500);
        schedule(delayMs, async () => {
          try {
            const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
            let text: string;
            let origin: 'glimmer' | 'offline' = 'offline';
            if (live) {
              try {
                text = await live.chat([
                  { role: 'user', content: `You are ${persona.displayName} (${persona.handle}), ${persona.vibe}. Reply briefly (under 140 chars) to: ${post.body}` },
                ]);
                origin = 'glimmer';
                noteAmbientLive();
              } catch (err) {
                noteAmbientFallback('activity:ambient-reply', err);
                text = pool[Math.floor(Math.random() * pool.length)];
              }
            } else {
              text = pool[Math.floor(Math.random() * pool.length)];
            }
            await store.createReply({
              id: uniqueReplyId(post.id, persona.id),
              postId: post.id,
              authorId: persona.id,
              body: text,
              replyOrder: existing.length + i,
              origin,
              createdAt: new Date().toISOString(),
            });
          } catch {
            // ignore
          }
        });
        summary.replies += 1;
      }
      const likers = shuffle(personas.filter((p) => p.id !== post.authorId)).slice(0, 3);
      for (const [i, persona] of likers.entries()) {
        schedule(4000 + i * 2000, async () => {
          try {
            if (!(await socialStore.isLiked(post.id, persona.id))) {
              await socialStore.toggleLike(post.id, persona.id);
            }
          } catch {
            // ignore
          }
        });
        summary.likes += 1;
      }
    }
  } catch {
    // ignore
  }
  return summary;
}

/** Occasionally a random active persona DMs the user out of the blue. */
export async function randomDmBeat(
  store: Store,
  _dmStore: DmStore,
  client: ModelClient | undefined,
  probability = 0.35,
): Promise<boolean> {
  try {
    if (Math.random() > probability) return false;
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return false;
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const threadId = `user:${persona.id}`;
    const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
    let text: string;
    let origin: 'glimmer' | 'offline' = 'offline';
    const live = await resolveAmbientClient(client);
    if (live) {
      try {
        text = await live.chat([
          { role: 'user', content: `You are ${persona.displayName}, a kind island friend. Send a short spontaneous DM (under 140 chars).` },
        ]);
        origin = 'glimmer';
        noteAmbientLive();
      } catch (err) {
        noteAmbientFallback('activity:random-dm', err);
        text = pool[Math.floor(Math.random() * pool.length)];
      }
    } else {
      text = pool[Math.floor(Math.random() * pool.length)];
    }
    await store.createDm({
      id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      threadId,
      senderId: persona.id,
      body: text,
      createdAt: new Date().toISOString(),
      origin,
    });
    return true;
  } catch {
    return false;
  }
}
