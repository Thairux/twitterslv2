import { Store } from './store';

export interface GeneratedImage {
  id: string;
  prompt: string;
  path: string;
  ownerId: string;
  createdAt: string;
}

export async function generatePlaceholderImage(store: Store, prompt: string, ownerId: string): Promise<GeneratedImage> {
  const id = `img-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const createdAt = new Date().toISOString();
  const path = '';
  await store.createGeneratedImage({
    id,
    prompt,
    path,
    ownerId,
    createdAt,
  });
  return { id, prompt, path, ownerId, createdAt };
}
