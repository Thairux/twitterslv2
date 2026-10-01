// Pure domain: social helpers. No Capacitor/SQLite/fetch imports.
import { Post } from './post';

export interface RankedPost {
  post: Post;
  score: number;
}

/** Engagement-ranked feed ("For you"): likes×2 + reposts×3 + replies + recency.
 *  Chronological ("Following") stays untouched — ranking is opt-in per tab. */
export function rankFeed(posts: Post[], replyCounts: Record<string, number>, now = Date.now()): RankedPost[] {
  const scored = posts.map((p) => {
    const ageHrs = Math.max(0, (now - new Date(p.createdAt).getTime()) / 3600000);
    const score = p.likes * 2 + p.reposts * 3 + (replyCounts[p.id] ?? 0) * 1.5 - Math.sqrt(ageHrs) * 2;
    return { post: p, score };
  });
  return scored.sort((a, b) => b.score - a.score);
}

const TAG_RE = /#[A-Za-z0-9_]{2,32}\b/g;

/** Extract lowercase #tags from a body. */
export function extractTags(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.match(TAG_RE) ?? []) out.add(m.toLowerCase());
  return [...out];
}

/** Trending tags across posts: [{tag, count}], most-used first. */
export function trendCounts(posts: Post[], limit = 10): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of extractTags(p.body)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Remove muted personas + mute-word hits. Case-insensitive substring match. */
export function filterMuted(posts: Post[], mutedIds: string[], muteWords: string[]): Post[] {
  const words = muteWords.map((w) => w.toLowerCase()).filter(Boolean);
  return posts.filter((p) => {
    if (mutedIds.includes(p.authorId)) return false;
    if (words.length === 0) return true;
    const low = p.body.toLowerCase();
    return !words.some((w) => low.includes(w));
  });
}

/** Search posts/personas by substring (handles, names, bodies). */
export function searchPosts(posts: Post[], q: string): Post[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return posts.filter((p) => p.body.toLowerCase().includes(needle));
}
