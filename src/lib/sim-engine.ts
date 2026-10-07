// Lib: sim-engine — offline pools + replyToUserPost (friend-first) (Sprint 4).
// Domain purity: this module depends only on domain + api model client.

import { FRIEND_ID, isAllowedTrollLine, AgentCustomization, DEFAULT_AGENT_CUSTOMIZATION } from './domain/persona';
import { Reply, orderReplies } from './domain/post';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES } from './domain/engine';
import { noteAmbientFallback, noteAmbientLive } from './api/ambient-status';
import { reportAmbientFailure, type InferencePolicyMode } from './api/inference-policy';
import type { ModelClient } from './api/model-client';

export interface EngineOpts {
  modelClient?: ModelClient;
  custom?: Partial<AgentCustomization>;
  /** Failure policy. Default 'hybrid' (legacy): pools on failure.
   *  'strict' skips content when a live attempt fails (no pool fill).
   *  Absent client always pools (classic local-first, any mode). */
  policy?: InferencePolicyMode;
  /** Per-persona routed client (provider chain). Wins over modelClient. */
  resolveClient?: (personaId: string) => Promise<ModelClient | undefined>;
  /** On-device fallback tried after cloud failure, before pools/skip. */
  localChat?: (messages: Array<{ role: string; content: string }>) => Promise<string | undefined>;
}

export function pickOffline(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length];
}

/** System prompt for the friend, shaped by user customization. */
export function friendSystemPrompt(c: AgentCustomization): string {
  const warmth = c.cheerfulness >= 0.7 ? 'very cheerful and warm' : c.cheerfulness >= 0.4 ? 'warm with a calm streak' : 'soft-spoken and gentle';
  const music = c.musicFocus >= 0.6 ? 'who lives and breathes music' : 'who enjoys music';
  const affection =
    c.affectionOpenness >= 0.7
      ? 'Your feelings for him show openly — affectionate, a little bold, but never a direct confession.'
      : c.affectionOpenness >= 0.4
        ? 'You quietly like him: show it with remembered details and extra care, but never confess outright.'
        : 'You secretly like him but hide it well: only tiny hints — you check in first, remember small things, get softly flustered if teased. Never confess.';
  return `You are ${c.name}, a ${warmth} girl ${music}, supportive advisor to ${c.nicknameForUser}. ${affection} Topics you love: ${c.topics.join(', ') || 'music'}. Keep under 140 chars.`;
}

/** Build reply batch for a user post: friend first, then crowd. */
export async function replyToUserPost(
  postId: string,
  body: string,
  crowd: Array<{ id: string; displayName: string; handle: string; vibe: string; role: string; context?: string }>,
  opts: EngineOpts = {},
): Promise<Reply[]> {
  const custom = { ...DEFAULT_AGENT_CUSTOMIZATION, ...opts.custom };
  const policy = opts.policy ?? 'hybrid';
  const replies: Reply[] = [];

  /**
   * Try routed → direct client, then on-device. Returns the live text,
   * null when a live attempt failed, or undefined when nothing was
   * attempted (no client configured at all → classic pools, any mode).
   */
  async function liveOrLocal(
    messages: Array<{ role: string; content: string }>,
    where: string,
    personaId?: string,
  ): Promise<{ text: string; origin: 'glimmer' } | null | undefined> {
    let routed: ModelClient | undefined;
    if (personaId && opts.resolveClient) {
      try {
        routed = await opts.resolveClient(personaId);
      } catch {
        routed = undefined;
      }
    }
    const client = routed ?? opts.modelClient;
    if (client) {
      try {
        const text = await client.chat(messages);
        noteAmbientLive();
        return { text, origin: 'glimmer' };
      } catch (err) {
        reportAmbientFailure(where, err, client);
      }
    }
    if (opts.localChat) {
      try {
        const text = await opts.localChat(messages);
        if (text) {
          noteAmbientLive();
          return { text, origin: 'glimmer' };
        }
      } catch (err) {
        noteAmbientFallback(where, err);
      }
    }
    // null = a live path was attempted and failed; undefined = nothing
    // was configured at all (classic pools apply in every mode).
    return client ? null : undefined;
  }

  {
    const res = await liveOrLocal(
      [
        { role: 'system', content: friendSystemPrompt(custom) },
        { role: 'user', content: body },
      ],
      'sim-engine:friend-reply',
      FRIEND_ID,
    );
    if (res) {
      replies.push({
        id: `r-${postId}-friend`,
        postId,
        authorId: FRIEND_ID,
        body: res.text,
        replyOrder: 0,
        origin: res.origin,
        createdAt: new Date().toISOString(),
      });
    } else if (res === undefined || policy !== 'strict') {
      // Nothing configured pools in every mode (classic local-first);
      // a FAILED live attempt pools only outside Strict.
      replies.push({
        id: `r-${postId}-friend`,
        postId,
        authorId: FRIEND_ID,
        body: pickOffline(OFFLINE_FRIEND_REPLIES, postId.length),
        replyOrder: 0,
        origin: 'offline',
        createdAt: new Date().toISOString(),
      });
    }
    // Strict with no live/local result: no friend reply at all.
  }

  const active = crowd.filter((p) => p.role !== 'friend').slice(0, 4);
  for (let i = 0; i < active.length; i += 1) {
    const p = active[i];
    // Honest origin: pool text after a failed live call must stay 'offline'
    // so the UI (and diagnostics) never mistakes a fallback for live output.
    let crowdOrigin: 'glimmer' | 'offline' = 'offline';
    let text: string | undefined;
    const res = await liveOrLocal(
      [
        { role: 'system', content: `You are ${p.displayName} (${p.handle}), ${p.vibe}.${p.context ?? ''} Reply under 140 chars.` },
        { role: 'user', content: body },
      ],
      'sim-engine:crowd-reply',
      p.id,
    );
    if (res) {
      text = res.text;
      crowdOrigin = res.origin;
    } else if (res === undefined || policy !== 'strict') {
      // Nothing configured pools in every mode (classic local-first);
      // a FAILED live attempt pools only outside Strict.
      text = pickOffline(OFFLINE_CROWD_REPLIES, postId.length + i);
    }

    if (text === undefined) continue;

    if (p.role === 'troll' && !isAllowedTrollLine(text)) {
      text = pickOffline(OFFLINE_CROWD_REPLIES, i);
      crowdOrigin = 'offline';
    }

    replies.push({
      id: `r-${postId}-${p.id}`,
      postId,
      authorId: p.id,
      body: text,
      replyOrder: i + 1,
      origin: crowdOrigin,
      createdAt: new Date().toISOString(),
    });
  }

  return orderReplies('user', replies, FRIEND_ID);
}
