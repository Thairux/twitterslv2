// API: activity — island liveliness engine (app layer).
// Personas post, reply (friend-first), like, and DM the user on timers so
// every user post gets responses within seconds and the feed never sits
// dead. All output degrades to offline pools when no endpoint is reachable.

import type { Store } from './store';
import type { SocialStore } from './social-store';
import type { DmStore } from './dm-store';
import type { Secrets } from './secrets';
import { ModelClient } from './model-client';
import { replyToUserPost } from '../sim-engine';
import { ambientTick as chatterPostTick, personaToPersonaDms } from '../chatter';
import { noteAmbientLive } from './ambient-status';
import {
  buildLiveClient,
  getInferencePolicy,
  ambientLocalEnabled,
  reportAmbientFailure,
  tryAmbientLocal,
  type InferencePolicyMode,
} from './inference-policy';
import { buildProviderClient } from './providers';
import { loadPersonaContexts } from './persona-context';
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
 * Never trust the passed (usually boot-time) client: always re-resolve from
 * storage so freshly saved endpoint/key/model take effect immediately.
 * Returns undefined when no endpoint is configured OR the endpoint is in
 * aggressive cooldown. Single shared builder lives in inference-policy.
 * An optional chain resolver (provider system) wins when it yields a client.
 */
export async function resolveAmbientClient(
  _preferred?: ModelClient,
  chain?: () => Promise<ModelClient | undefined>,
): Promise<ModelClient | undefined> {
  if (chain) {
    try {
      const routed = await chain();
      if (routed) return routed;
    } catch {
      // fall through to global slots
    }
  }
  return buildLiveClient();
}

/** Provider-chain resolver bound to store/secrets (+ optional persona). */
export function chainResolver(
  store: Store,
  secrets: Secrets | undefined,
  personaId?: string,
): (() => Promise<ModelClient | undefined>) | undefined {
  if (!secrets) return undefined;
  return () => buildProviderClient(store, secrets, 'chat', personaId);
}

/** Local-chat closure for EngineOpts, or undefined when ambient-local is off. */
async function ambientLocalChat(
  store: Pick<Store, 'getAgentConfig'>,
): Promise<((messages: Array<{ role: string; content: string }>) => Promise<string | undefined>) | undefined> {
  try {
    if (!(await ambientLocalEnabled(store))) return undefined;
  } catch {
    return undefined;
  }
  return async (messages) => (await tryAmbientLocal(messages))?.text;
}

/**
 * Answer a post within seconds: friend replies first, then crowd replies,
 * then a shower of likes. Fire-and-forget; every step is individually
 * try-caught so one failure never blocks the rest.
 */
export function respondToPost(
  socialStore: Pick<SocialStore, 'toggleLike' | 'isLiked'>,
  store: Pick<Store, 'listPersonas' | 'createReply' | 'listReplies' | 'getAgentConfig' | 'listRelationships' | 'getPersonaState' | 'query' | 'getPost' | 'listFollowing'>,
  client: ModelClient | undefined,
  postId: string,
  body: string,
  schedule: Scheduler = defaultSchedule,
  secrets?: Secrets,
): void {
  const run = async () => {
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return;
    // Reply-audience gate: friend always allowed; followed needs the user
    // to follow them; mentioned needs an @handle/name hit in the post.
    let gate: 'everyone' | 'followed' | 'mentioned' = 'everyone';
    try {
      const post = await store.getPost(postId);
      if (post?.replyControl === 'followed' || post?.replyControl === 'mentioned') gate = post.replyControl;
    } catch {
      // open gate on read failure
    }
    let allowed = personas;
    if (gate !== 'everyone') {
      const following = gate === 'followed' ? await store.listFollowing().catch(() => [] as string[]) : [];
      const lowered = body.toLowerCase();
      allowed = personas.filter((p) => {
        if (p.role === 'friend') return true;
        if (gate === 'followed') return following.includes(p.id);
        return lowered.includes(`@${p.handle.toLowerCase()}`) || lowered.includes(p.displayName.toLowerCase());
      });
      if (allowed.length === 0) return;
    }
    const policy: InferencePolicyMode = await getInferencePolicy(store).catch(() => 'strict' as const);
    const chain = chainResolver(store as Store, secrets);
    const live = policy === 'offline' ? undefined : await resolveAmbientClient(client, chain);
    const localChat = await ambientLocalChat(store);
    const crowd = allowed.map((p) => ({ id: p.id, displayName: p.displayName, handle: p.handle, vibe: p.vibe, role: p.role }));
    try {
      const contexts = await loadPersonaContexts(store, allowed.map((p) => p.id));
      for (const c of crowd) {
        const ctx = contexts.get(c.id);
        if (ctx?.blurb) (c as { context?: string }).context = ctx.blurb;
      }
    } catch {
      // stateless fallback
    }
    const resolveClient = chain
      ? async (personaId: string) => resolveAmbientClient(undefined, chainResolver(store as Store, secrets, personaId))
      : undefined;
    const replies = await replyToUserPost(postId, body, crowd, { modelClient: live, policy, localChat, resolveClient });
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
  secrets?: Secrets,
): Promise<{ posts: number; replies: number; likes: number }> {
  const summary = { posts: 0, replies: 0, likes: 0 };
  const policy: InferencePolicyMode = await getInferencePolicy(store).catch(() => 'strict' as const);
  const chain = chainResolver(store, secrets);
  const live = policy === 'offline' ? undefined : await resolveAmbientClient(client, chain);
  const localChat = await ambientLocalChat(store);
  try {
    await chatterPostTick(store, live, secrets);
    summary.posts += 1;
  } catch {
    // posting failed — still try interactions below
  }
  // Personas also DM each other (agent threads stay out of your inbox,
  // which stays yours alone — but the island talks behind the scenes).
  if (Math.random() < 0.3) {
    try {
      await personaToPersonaDms(store, live, secrets);
    } catch {
      // ignore
    }
  }
  try {
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return summary;
    const contexts = await loadPersonaContexts(store, personas.map((p) => p.id)).catch(
      () => new Map<string, { blurb: string; asleep: boolean }>(),
    );
    const feed = await socialStore.rankFeed('user');
    const targets = feed.slice(0, 3);
    for (const post of targets) {
      const others = shuffle(personas.filter((p) => p.id !== post.authorId && !contexts.get(p.id)?.asleep)).slice(0, 2);
      const existing = await store.listReplies(post.id);
      for (const [i, persona] of others.entries()) {
        const delayMs = 2000 + i * 2500 + Math.floor(Math.random() * 1500);
        schedule(delayMs, async () => {
          try {
            const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
            let text: string | undefined;
            let origin: 'glimmer' | 'offline' = 'offline';
            if (live) {
              try {
                const ctx = contexts.get(persona.id)?.blurb ?? '';
                const threadCtx = existing.length > 0
                  ? ` Conversation so far: ${existing.slice(-2).map((r) => r.body.slice(0, 80)).join(' / ')}`
                  : '';
                text = await live.chat([
                  { role: 'user', content: `You are ${persona.displayName} (${persona.handle}), ${persona.vibe}.${ctx} Reply briefly (under 140 chars) to: ${post.body}${threadCtx}` },
                ]);
                origin = 'glimmer';
                noteAmbientLive();
              } catch (err) {
                reportAmbientFailure('activity:ambient-reply', err, live);
                const local = localChat
                  ? await localChat([
                      { role: 'user', content: `You are ${persona.displayName} (${persona.handle}), ${persona.vibe}. Reply briefly (under 140 chars) to: ${post.body}` },
                    ]).catch(() => undefined)
                  : undefined;
                if (local) {
                  text = local;
                  origin = 'glimmer';
                } else if (policy !== 'strict') {
                  text = pool[Math.floor(Math.random() * pool.length)];
                }
                // Strict with no local fallback: text stays undefined and
                // nothing is posted — diagnostics carry the failure state.
              }
            } else {
              text = pool[Math.floor(Math.random() * pool.length)];
            }
            if (text === undefined) return;
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
  secrets?: Secrets,
): Promise<boolean> {
  try {
    if (Math.random() > probability) return false;
    const personas = (await store.listPersonas()).filter((p) => p.active && p.id !== 'user');
    if (personas.length === 0) return false;
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const threadId = `user:${persona.id}`;
    const pool = persona.role === 'friend' ? OFFLINE_FRIEND_REPLIES : OFFLINE_CROWD_REPLIES;
    let text: string | undefined;
    let origin: 'glimmer' | 'offline' = 'offline';
    const policy: InferencePolicyMode = await getInferencePolicy(store).catch(() => 'strict' as const);
    const chain = chainResolver(store as Store, secrets, persona.id);
    const live = policy === 'offline' ? undefined : await resolveAmbientClient(client, chain);
    if (live) {
      try {
        text = await live.chat([
          { role: 'user', content: `You are ${persona.displayName}, a kind island friend. Send a short spontaneous DM (under 140 chars).` },
        ]);
        origin = 'glimmer';
        noteAmbientLive();
      } catch (err) {
        reportAmbientFailure('activity:random-dm', err, live);
        if (await ambientLocalEnabled(store).catch(() => false)) {
          text = (await tryAmbientLocal([
            { role: 'user', content: `You are ${persona.displayName}, a kind island friend. Send a short spontaneous DM (under 140 chars).` },
          ]))?.text;
          if (text) origin = 'glimmer';
        }
        if (text === undefined && policy !== 'strict') {
          text = pool[Math.floor(Math.random() * pool.length)];
        }
      }
    } else {
      text = pool[Math.floor(Math.random() * pool.length)];
    }
    if (text === undefined) return false;
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
