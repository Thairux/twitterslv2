// API: http — platform-aware JSON/text fetching.
// On native, requests go through CapacitorHttp (OkHttp — no WebView
// CORS/preflight, which most public APIs don't answer). On web, plain
// fetch with abortable timeouts. Thrown network errors retry once to ride
// out transient mobile-network resets. Streaming bodies (model downloads)
// stay on window.fetch and never come here.

import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface SimpleResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

function isNativeHttp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function apiFetch(
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
        const asText = async (): Promise<string> =>
          typeof data === 'string' ? data : JSON.stringify(data ?? '');
        return {
          ok: status >= 200 && status < 300,
          status,
          json: async () => {
            if (typeof data === 'string') return JSON.parse(data);
            return data;
          },
          text: asText,
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
          text: async () => res.text(),
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
