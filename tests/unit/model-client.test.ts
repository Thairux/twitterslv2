import { describe, it, expect, vi, afterEach } from 'vitest';
import { ModelClient, normalizeEndpoint } from '../../src/lib/api/model-client';

const realFetch = globalThis.fetch;

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = realFetch;
});

function stubFetch(handler: (url: string, init?: RequestInit) => unknown) {
  globalThis.fetch = vi.fn(async (url: unknown, init?: unknown) => handler(String(url), init as RequestInit)) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('ModelClient.listModels', () => {
  it('returns [] when no endpoint is configured', async () => {
    const client = new ModelClient('');
    await expect(client.listModels()).resolves.toEqual([]);
  });

  it('parses OpenAI-style {data:[{id}]} from /v1/models', async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return jsonResponse({ data: [{ id: 'step-3.7-flash:free' }] });
    });
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.listModels()).resolves.toEqual([{ id: 'step-3.7-flash:free', name: undefined }]);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain('/v1/models');
  });

  it('falls back to /models when /v1/models misses', async () => {
    stubFetch((url) => {
      if (url.endsWith('/v1/models')) return jsonResponse({}, 404);
      return jsonResponse({ data: [{ id: 'llama-3.1-8b' }] });
    });
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.listModels()).resolves.toEqual([{ id: 'llama-3.1-8b', name: undefined }]);
  });

  it('accepts a plain array shape', async () => {
    stubFetch(() => jsonResponse([{ name: 'm1' }]));
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.listModels()).resolves.toEqual([{ id: 'm1', name: 'm1' }]);
  });

  it('returns [] when every path fails', async () => {
    stubFetch(() => jsonResponse({}, 500));
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.listModels()).resolves.toEqual([]);
  });
});

describe('normalizeEndpoint', () => {
  it('trims, defaults to https, and strips trailing slashes', () => {
    expect(normalizeEndpoint('')).toBe('');
    expect(normalizeEndpoint('  ')).toBe('');
    expect(normalizeEndpoint('example.com/')).toBe('https://example.com');
    expect(normalizeEndpoint('http://127.0.0.1:8080///')).toBe('http://127.0.0.1:8080');
    expect(normalizeEndpoint('https://gateway.example/v1/')).toBe('https://gateway.example/v1');
  });
});

describe('ModelClient.probe', () => {
  it('reports which path answered', async () => {
    stubFetch((url) => {
      if (url.endsWith('/v1/models')) return jsonResponse({ data: [{ id: 'm1' }] });
      return jsonResponse({}, 404);
    });
    const probe = await new ModelClient('example.com').probe();
    expect(probe.ok).toBe(true);
    expect(probe.via).toBe('/v1/models');
    expect(probe.models).toEqual([{ id: 'm1', name: undefined }]);
  });

  it('flags auth failures instead of silent empty', async () => {
    stubFetch(() => jsonResponse({}, 401));
    const probe = await new ModelClient('https://gw.example', 'bad-key').probe();
    expect(probe.ok).toBe(false);
    expect(probe.status).toBe(401);
    expect(probe.error).toMatch(/API key/);
  });

  it('falls back to /health for llama.cpp-style endpoints', async () => {
    stubFetch((url) => {
      if (url.endsWith('/health')) return jsonResponse({ status: 'ok' });
      return jsonResponse({}, 404);
    });
    const probe = await new ModelClient('http://127.0.0.1:8080').probe();
    expect(probe.ok).toBe(true);
    expect(probe.via).toBe('/health');
  });
});

describe('ModelClient.chat model wiring', () => {
  it('sends the model id in the request body', async () => {
    let body = '';
    stubFetch((_url, init) => {
      body = String(init?.body);
      return jsonResponse({ choices: [{ message: { content: 'OK' } }] });
    });
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(
      client.chat([{ role: 'user', content: 'hi' }], { model: 'step-3.7-flash:free' }),
    ).resolves.toBe('OK');
    expect(JSON.parse(body).model).toBe('step-3.7-flash:free');
  });

  it('retries once on 429 then succeeds', async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      if (calls === 1) return jsonResponse({}, 429);
      return jsonResponse({ choices: [{ message: { content: 'OK' } }] });
    });
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.chat([{ role: 'user', content: 'hi' }], { retryDelayMs: 1 })).resolves.toBe('OK');
    expect(calls).toBe(2);
  });

  it('throws RateLimitError after a second 429', async () => {
    stubFetch(() => jsonResponse({}, 429));
    const client = new ModelClient('http://127.0.0.1:8080');
    await expect(client.chat([{ role: 'user', content: 'hi' }], { retryDelayMs: 1 })).rejects.toThrow('Rate limited');
  });

  it('omits model when none is selected', async () => {
    let body = '';
    stubFetch((_url, init) => {
      body = String(init?.body);
      return jsonResponse({ choices: [{ message: { content: 'OK' } }] });
    });
    const client = new ModelClient('http://127.0.0.1:8080');
    await client.chat([{ role: 'user', content: 'hi' }]);
    expect('model' in JSON.parse(body)).toBe(false);
  });
});
