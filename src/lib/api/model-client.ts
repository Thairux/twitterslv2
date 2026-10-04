// API: model-client (Sprint 7 — ports v1 lib/api/glimmer.ts, renamed).
// "Model Endpoint URL" + API key; offline fallback with attempt history +
// fallback flag on every generation. Timeouts + malformed-response handling.
// Supports sidecar endpoints for image generation and captioning.

import { Store } from './store';

export interface ModelClientOptions {
  chatEndpoint?: string;
  chatApiKey?: string;
  imageGenEndpoint?: string;
  captionEndpoint?: string;
}

export class ConnectionError extends Error {}
export class AuthError extends Error {}
export class RateLimitError extends Error {}
export class ParseError extends Error {}

export class ModelClient {
  readonly chatEndpoint: string;
  readonly chatApiKey?: string;
  readonly imageGenEndpoint?: string;
  readonly captionEndpoint?: string;

  constructor(endpoint: string, apiKey?: string, opts: ModelClientOptions = {}) {
    this.chatEndpoint = opts.chatEndpoint ?? endpoint;
    this.chatApiKey = opts.chatApiKey ?? apiKey;
    this.imageGenEndpoint = opts.imageGenEndpoint;
    this.captionEndpoint = opts.captionEndpoint;
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.chatEndpoint) {
      throw new ConnectionError('Model endpoint URL is empty');
    }
    const base = this.chatEndpoint.replace(/\/$/, '');
    const url = `${base}/v1/chat/completions`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.chatApiKey ? { Authorization: `Bearer ${this.chatApiKey}` } : {}),
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 401 || res.status === 403) {
        throw new AuthError(`Auth failed (${res.status})`);
      }
      if (res.status === 429) {
        throw new RateLimitError('Rate limited by endpoint');
      }
      if (!res.ok) {
        throw new ConnectionError(`Endpoint returned ${res.status}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const choices = json?.choices as Array<{ message?: { content?: string } }> | undefined;
      const text = choices?.[0]?.message?.content;
      if (typeof text !== 'string') {
        throw new ParseError('Malformed response: missing choices[0].message.content');
      }
      return text;
    } catch (err) {
      if (err instanceof ConnectionError || err instanceof AuthError || err instanceof RateLimitError || err instanceof ParseError) {
        throw err;
      }
      throw new ConnectionError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async captionImage(imagePath: string): Promise<string> {
    if (!this.captionEndpoint) {
      throw new ConnectionError('Caption endpoint URL is empty');
    }
    const base = this.captionEndpoint.replace(/\/$/, '');
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
        throw new ConnectionError(`Caption endpoint returned ${res.status}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const description = json?.description as string | undefined;
      if (!description) {
        throw new ParseError('Malformed caption response: missing description');
      }
      return description;
    } catch (err) {
      if (err instanceof ConnectionError || err instanceof ParseError) {
        throw err;
      }
      throw new ConnectionError(`Caption network error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  offlineReply(pool: string[]): string {
    if (!pool || pool.length === 0) return '';
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  async recordAttempt(store: Store, postId: string | undefined, _via: string, artifactPath?: string): Promise<void> {
    const id = `gi-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const createdAt = new Date().toISOString();
    const prompt = postId ? `post:${postId}` : 'ambient';
    await store.createGeneratedImage({
      id,
      prompt,
      path: artifactPath ?? 'inline',
      ownerId: postId ?? 'ambient',
      createdAt,
    });
  }

  async listModels(): Promise<Array<{ id: string; name?: string }>> {
    if (!this.chatEndpoint) return [];
    const base = this.chatEndpoint.replace(/\/$/, '');
    const url = `${base}/v1/models`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(url, {
        headers: {
          ...(this.chatApiKey ? { Authorization: `Bearer ${this.chatApiKey}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const json = (await res.json()) as Record<string, unknown>;
      const data = json?.data as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(data)) return [];
      return data
        .filter((item): item is { id: string; name?: string } => typeof item.id === 'string')
        .map((item) => ({ id: item.id, name: typeof item.name === 'string' ? item.name : undefined }));
    } catch {
      return [];
    }
  }
}
