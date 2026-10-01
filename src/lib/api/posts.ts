export interface Post {
  id: string;
  author: {
    name: string;
    handle: string;
    avatarUrl?: string;
  };
  body: string;
  createdAt: string;
  ai_generated: boolean;
  likes: number;
  reposts: number;
}

export interface CreatePostInput {
  body: string;
  replyTo?: string;
}

export async function create(_input: CreatePostInput): Promise<Post> {
  throw new Error('Not implemented: api.posts.create (use store.createPost directly)');
}
