import { Store } from './store';
import { rankFeed, searchPosts as domainSearchPosts, filterMuted as domainFilterMuted } from '../domain/social';
import type { Post, Reply } from '../domain/post';
import type { Persona } from '../domain/persona';
import type { RankedPost } from '../domain/social';

export class SocialStore {
  constructor(private store: Store) {}

  async rankFeed(_userId?: string): Promise<Post[]> {
    const posts = await this.store.listPosts();
    const mutedPersonas = await this.store.listMutes();
    const blockedPersonas = await this.store.listBlocks();
    const mutedWords = await this.store.listMutedWords();
    const replyCounts: Record<string, number> = {};
    const allReplies = await this.store.listReplies();
    for (const r of allReplies) {
      replyCounts[r.postId] = (replyCounts[r.postId] ?? 0) + 1;
    }
    const muted = domainFilterMuted(posts, mutedPersonas, mutedWords);
    const filtered = muted.filter((p) => !blockedPersonas.includes(p.authorId));
    const ranked: RankedPost[] = rankFeed(filtered, replyCounts);
    return ranked.map((rp) => rp.post);
  }

  async listFeedFollowing(userId: string): Promise<Post[]> {
    const followingIds = await this.store.listFollowing();
    const mutedPersonas = await this.store.listMutes();
    const mutedWords = await this.store.listMutedWords();
    const blockedPersonas = await this.store.listBlocks();
    const allPosts = await this.store.listPosts();
    const muted = domainFilterMuted(allPosts, mutedPersonas, mutedWords);
    const filtered = muted.filter((p) => !blockedPersonas.includes(p.authorId));
    return filtered.filter((p) => p.authorId === userId || followingIds.includes(p.authorId));
  }

  async getThread(postId: string): Promise<{ post: Post | null; replies: Reply[] }> {
    const post = await this.store.getPost(postId);
    const replies = post ? await this.store.listReplies(postId) : [];
    return { post: post ?? null, replies };
  }

  async searchPosts(query: string, filters?: { authorId?: string }): Promise<Post[]> {
    const allPosts = await this.store.listPosts();
    const mutedPersonas = await this.store.listMutes();
    const mutedWords = await this.store.listMutedWords();
    const blockedPersonas = await this.store.listBlocks();
    let results = domainSearchPosts(allPosts, query);
    if (filters?.authorId) {
      results = results.filter((p) => p.authorId === filters.authorId);
    }
    const muted = domainFilterMuted(results, mutedPersonas, mutedWords);
    return muted.filter((p) => !blockedPersonas.includes(p.authorId));
  }

  async searchPersonas(query: string): Promise<Persona[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const personas = await this.store.listPersonas();
    return personas.filter(
      (p) => p.handle.toLowerCase().includes(needle) || p.displayName.toLowerCase().includes(needle),
    );
  }

  async filterMuted(posts: Post[], mutedHandles: string[]): Promise<Post[]> {
    return domainFilterMuted(posts, mutedHandles, []);
  }

  async getPoll(postId: string): Promise<{ question: string; options: Array<{ id: string; label: string; votes: number }> } | null> {
    return this.store.getPoll(postId);
  }
}
