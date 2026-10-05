// API: model-client (Sprint 7 — ports v1 lib/api/glimmer.ts, renamed).
// "Model Endpoint URL" + API key; offline fallback with attempt history +
// fallback flag on every generation. Timeouts + malformed-response handling.
// Supports sidecar endpoints for image generation and captioning.

import { Store } from './store';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface ModelClientOptions {
  chatEndpoint?: string;
  chatApiKey?: string;
  imageGenEndpoint?: string;
  captionEndpoint?: string;
  /** Model id sent as `model` in chat requests (e.g. Kilo gateway ids). */
  defaultModel?: string;
}

export class ConnectionError extends Error {}
export class AuthError extends Error {}
export class RateLimitError extends Error {}
export class ParseError extends Error {}

/** Trim whitespace, default to https://, drop trailing slashes. */
export function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withScheme = /:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

export interface EndpointProbe {
  ok: boolean;
  /** Which probe answered, if any. */
  via?: '/v1/models' | '/models' | '/health' | 'base';
  status?: number;
  models: Array<{ id: string; name?: string }>;
  error?: string;
}

interface SimpleResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

function isNativeHttp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Platform HTTP for JSON APIs. On native, requests go through CapacitorHttp
 * (OkHttp — no WebView CORS/preflight, which APIs like Kilo's gateway don't
 * answer). On web, plain fetch with abortable timeouts. Thrown errors are
 * retried once to ride out transient mobile-network resets.
 */
async function apiFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number },
): Promise<SimpleResponse> {
  const { method = 'GET', headers = {}, body, timeoutMs = 15_000 } = init;
  let lastError: unknown = new Error('unreachable');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (isNativeHttp()) {
        const res = await CapacitorHttp.request({
          url,
          method: method as 'GET' | 'POST',
          headers,
          data: body,
          connectTimeout: Math.min(timeoutMs, 15_000),
          readTimeout: timeoutMs,
        });
        const status = res.status;
        const data = (res as { data?: unknown }).data;
        return {
          ok: status >= 200 && status < 300,
          status,
          json: async () => {
            if (typeof data === 'string') return JSON.parse(data);
            return data;
          },
        };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers,
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
        });
        return {
          ok: res.ok,
          status: res.status,
          json: async () => res.json(),
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

export class ModelClient {
  readonly chatEndpoint: string;
  readonly chatApiKey?: string;
  readonly imageGenEndpoint?: string;
  readonly captionEndpoint?: string;
  readonly defaultModel?: string;

  constructor(endpoint: string, apiKey?: string, opts: ModelClientOptions = {}) {
    this.chatEndpoint = opts.chatEndpoint ?? endpoint;
    this.chatApiKey = opts.chatApiKey ?? apiKey;
    this.imageGenEndpoint = opts.imageGenEndpoint;
    this.captionEndpoint = opts.captionEndpoint;
    this.defaultModel = opts.defaultModel;
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    opts: { model?: string; retryDelayMs?: number } = {},
  ): Promise<string> {
    if (!this.chatEndpoint) {
      throw new ConnectionError('Model endpoint URL is empty');
    }
    const base = this.chatEndpoint.replace(/\/$/, '');
    const url = `${base}/v1/chat/completions`;
    const model = opts.model ?? this.defaultModel;
    const retryDelayMs = opts.retryDelayMs ?? 3000;
    let rateLimitedOnce = false;
    for (;;) {
      try {
        const res = await apiFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.chatApiKey ? { Authorization: `Bearer ${this.chatApiKey}` } : {}),
          },
          body: JSON.stringify({ ...(model ? { model } : {}), messages }),
          timeoutMs: 30_000,
        });

        if (res.status === 401 || res.status === 403) {
          throw new AuthError(`Auth failed (${res.status})`);
        }
        if (res.status === 429) {
          // Free-tier gateways throttle aggressively — one polite retry.
          if (!rateLimitedOnce) {
            rateLimitedOnce = true;
            await new Promise((r) => setTimeout(r, retryDelayMs));
            continue;
          }
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
    const probe = await this.probe();
    return probe.models;
  }

  /**
   * Gateway-aware reachability probe. Tries OpenAI-compatible model lists
   * first (cloud gateways like Kilo), then llama.cpp-style paths, then a
   * bare base-URL fetch — reporting exactly what answered instead of a
   * generic "cannot reach".
   */
  async probe(): Promise<EndpointProbe> {
    if (!this.chatEndpoint) return { ok: false, models: [], error: 'Model endpoint URL is empty' };
    const base = this.chatEndpoint.replace(/\/$/, '');
    const headers: Record<string, string> = {
      ...(this.chatApiKey ? { Authorization: `Bearer ${this.chatApiKey}` } : {}),
    };
    const get = async (path: string, timeoutMs: number) =>
      apiFetch(`${base}${path}`, { headers, timeoutMs });
    const parseModels = async (res: SimpleResponse): Promise<Array<{ id: string; name?: string }> | null> => {
      if (res.status === 401 || res.status === 403) return null;
      if (!res.ok) return null;
      try {
        const json = (await res.json()) as Record<string, unknown>;
        const raw = Array.isArray(json)
          ? (json as Array<Record<string, unknown>>)
          : ((json?.data as Array<Record<string, unknown>> | undefined) ?? []);
        if (!Array.isArray(raw) || raw.length === 0) return null;
        const models = raw
          .filter((item) => typeof item.id === 'string' || typeof item.name === 'string')
          .map((item) => ({
            id: String(item.id ?? item.name),
            name: typeof item.name === 'string' ? item.name : undefined,
          }));
        return models.length > 0 ? models : null;
      } catch {
        return null;
      }
    };

    for (const p of ['/v1/models', '/models'] as const) {
      try {
        const res = await get(p, 15_000);
        if (res.status === 401 || res.status === 403) {
          return { ok: false, status: res.status, models: [], error: `Endpoint requires an API key (${res.status}).` };
        }
        const models = await parseModels(res);
        if (models) return { ok: true, via: p, status: res.status, models };
      } catch {
        // try next path
      }
    }
    try {
      const res = await get('/health', 10_000);
      if (res.ok) return { ok: true, via: '/health', status: res.status, models: [] };
    } catch {
      // fall through
    }
    try {
      const res = await get('', 10_000);
      if (res.ok) return { ok: true, via: 'base', status: res.status, models: [] };
      return { ok: false, status: res.status, models: [], error: `Endpoint answered ${res.status}.` };
    } catch (e) {
      return { ok: false, models: [], error: `Cannot reach endpoint: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
