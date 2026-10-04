// API: vision — image captioning via sidecar endpoint (Sprint 7 port).
// If no caption endpoint is configured, returns a neutral fallback string.

export async function describeImage(imagePath: string, captionEndpoint?: string): Promise<string> {
  if (!captionEndpoint) {
    return 'an attached photo (caption unavailable offline)';
  }

  const base = captionEndpoint.replace(/\/$/, '');
  const url = `${base}/caption`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_path: imagePath }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Caption endpoint returned ${res.status}`);
    }
    const json = (await res.json()) as Record<string, unknown>;
    const description = json?.description as string | undefined;
    if (!description) {
      throw new Error('Caption response missing description');
    }
    return description;
  } catch {
    return 'an attached photo (caption unavailable offline)';
  }
}
