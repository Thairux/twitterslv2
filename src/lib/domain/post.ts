// Pure domain: posts/replies/reactions. No Capacitor/SQLite/fetch imports.

export interface Post {
  id: string;
  authorId: string;
  body: string;
  imagePath?: string;
  imagePrompt?: string;
  /** Remote image URL (curated pool / user link) — rendered as-is. */
  imageUrl?: string;
  quotedPostId?: string;
  edited?: boolean;
  createdAt: string;
  likes: number;
  reposts: number;
  origin: 'glimmer' | 'offline';
  aiGenerated?: boolean;
}

export interface Reply {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  imagePath?: string;
  replyOrder: number;
  /** Optional parent reply — one nesting level, X-style threads. */
  parentReplyId?: string;
  origin: 'glimmer' | 'offline';
  createdAt: string;
}

export interface Reaction {
  id: string;
  postId: string;
  kind: 'like' | 'repost';
  createdAt: string;
}

export const MAX_POST_LEN = 280;
export const EDIT_WINDOW_MS = 10 * 60 * 1000;

export interface MakePostOpts {
  aiGenerated?: boolean;
  origin?: 'glimmer' | 'offline';
  likes?: number;
  reposts?: number;
  edited?: boolean;
  imagePath?: string;
  imagePrompt?: string;
  imageUrl?: string;
  quotedPostId?: string;
}

export function makePost(authorId: string, body: string, opts: MakePostOpts = {}): Post {
  return {
    id: `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    authorId,
    body: body.slice(0, MAX_POST_LEN),
    createdAt: new Date().toISOString(),
    likes: opts.likes ?? 0,
    reposts: opts.reposts ?? 0,
    origin: opts.origin ?? 'glimmer',
    aiGenerated: opts.aiGenerated,
    edited: opts.edited,
    imagePath: opts.imagePath,
    imagePrompt: opts.imagePrompt,
    imageUrl: opts.imageUrl,
    quotedPostId: opts.quotedPostId,
  };
}

/** Order replies: friend first on user posts, then by creation. */
export function orderReplies(postAuthorId: string, replies: Reply[], friendId: string): Reply[] {
  const sorted = [...replies].sort((a, b) => a.replyOrder - b.replyOrder);
  if (postAuthorId !== 'user') return sorted;
  return [...sorted].sort((a, b) =>
    a.authorId === friendId ? -1 : b.authorId === friendId ? 1 : 0,
  );
}

export function canEditPost(post: Post, now = Date.now()): boolean {
  if (post.authorId !== 'user') return false;
  return now - new Date(post.createdAt).getTime() <= EDIT_WINDOW_MS;
}

export function isAiGenerated(post: Post): boolean {
  return !!post.aiGenerated;
}
