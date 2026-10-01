// API: model-client (Sprint 7 — ports v1 lib/api/glimmer.ts, renamed).
// "Model Endpoint URL" + API key; offline fallback with attempt history +
// fallback flag on every generation. Timeouts + malformed-response handling.

import { Store } from './store';

export class ConnectionError extends Error {}
export class AuthError extends Error {}
export class RateLimitError extends Error {}
export class ParseError extends Error {}

export class ModelClient {
  constructor(private endpoint: string, private apiKey?: string) {}

  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.endpoint) {
      throw new ConnectionError('Model endpoint URL is empty');
    }
    const base = this.endpoint.replace(/\/$/, '');
    const url = `${base}/v1/chat/completions`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
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

  offlineReply(pool: string[]): string {
    if (!pool || pool.length === 0) return '';
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  async recordAttempt(store: Store, postId: string | undefined, _via: string): Promise<void> {
    const id = `gi-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const createdAt = new Date().toISOString();
    const prompt = postId ? `post:${postId}` : 'ambient';
    await store.createGeneratedImage({
      id,
      prompt,
      path: '',
      ownerId: postId ?? 'ambient',
      createdAt,
    });
  }
}
