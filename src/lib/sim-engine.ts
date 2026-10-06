// Lib: sim-engine — offline pools + replyToUserPost (friend-first) (Sprint 4).
// Domain purity: this module depends only on domain + api model client.

import { FRIEND_ID, isAllowedTrollLine, AgentCustomization, DEFAULT_AGENT_CUSTOMIZATION } from './domain/persona';
import { Reply, orderReplies } from './domain/post';
import { OFFLINE_FRIEND_REPLIES, OFFLINE_CROWD_REPLIES } from './domain/engine';
import { noteAmbientFallback, noteAmbientLive } from './api/ambient-status';
import type { ModelClient } from './api/model-client';

export interface EngineOpts {
  modelClient?: ModelClient;
  custom?: Partial<AgentCustomization>;
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
  crowd: Array<{ id: string; displayName: string; handle: string; vibe: string; role: string }>,
  opts: EngineOpts = {},
): Promise<Reply[]> {
  const custom = { ...DEFAULT_AGENT_CUSTOMIZATION, ...opts.custom };
  const replies: Reply[] = [];

  if (opts.modelClient) {
    try {
      const friendText = await opts.modelClient.chat([
        { role: 'system', content: friendSystemPrompt(custom) },
        { role: 'user', content: body },
      ]);
      noteAmbientLive();
      replies.push({
        id: `r-${postId}-friend`,
        postId,
        authorId: FRIEND_ID,
        body: friendText,
        replyOrder: 0,
        origin: 'glimmer',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      noteAmbientFallback('sim-engine:friend-reply', err);
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
  } else {
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

  const active = crowd.filter((p) => p.role !== 'friend').slice(0, 4);
  for (let i = 0; i < active.length; i += 1) {
    const p = active[i];
    let text: string;
    // Honest origin: pool text after a failed live call must stay 'offline'
    // so the UI (and diagnostics) never mistakes a fallback for live output.
    let crowdOrigin: 'glimmer' | 'offline' = 'offline';
    if (opts.modelClient) {
      try {
        text = await opts.modelClient.chat([
          { role: 'system', content: `You are ${p.displayName} (${p.handle}), ${p.vibe}. Reply under 140 chars.` },
          { role: 'user', content: body },
        ]);
        crowdOrigin = 'glimmer';
        noteAmbientLive();
      } catch (err) {
        noteAmbientFallback('sim-engine:crowd-reply', err);
        text = pickOffline(OFFLINE_CROWD_REPLIES, postId.length + i);
      }
    } else {
      text = pickOffline(OFFLINE_CROWD_REPLIES, postId.length + i);
    }

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
