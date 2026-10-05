import { describe, it, expect, vi, afterEach } from 'vitest';
import { ModelClient } from '../../src/lib/api/model-client';

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
