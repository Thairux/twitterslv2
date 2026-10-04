// API: image — image generation via sidecar endpoint (Sprint 7 port).
// If no image-gen endpoint is configured, returns a deterministic placeholder path.

export interface ImageGenResult {
  path: string;
  via: 'local-model' | 'placeholder';
}

export async function generateImage(
  prompt: string,
  ownerId: string,
  imageGenEndpoint?: string
): Promise<ImageGenResult> {
  if (!imageGenEndpoint) {
    const seed = Math.abs(hash(prompt)) % 1e6;
    return { path: `placeholder:${ownerId}:${seed}`, via: 'placeholder' };
  }

  const base = imageGenEndpoint.replace(/\/$/, '');
  const url = `${base}/generate`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt.slice(0, 200), owner: ownerId }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Image generation endpoint returned ${res.status}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const path = json?.path as string | undefined;
    if (!path) {
      throw new Error('Image generation response missing path');
    }
    return { path, via: 'local-model' };
  } catch {
    const seed = Math.abs(hash(prompt)) % 1e6;
    return { path: `placeholder:${ownerId}:${seed}`, via: 'placeholder' };
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
