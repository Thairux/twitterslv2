// API: opengraph — structured link metadata extraction (Sprint 7 port).
// Complements `newspaper.ts` with OG-specific fields when available.

import { apiFetch } from './http';

export interface OpenGraphResult {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
  type?: string;
  error?: string;
}

export async function extractOpenGraph(url: string, timeoutMs = 10_000): Promise<OpenGraphResult> {
  try {
    // Native bridge on device (no CORS); plain fetch on web.
    const res = await apiFetch(url, { timeoutMs });
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const result: OpenGraphResult = {};

    const metaTags: Array<{ property: string; key: keyof OpenGraphResult }> = [
      { property: 'og:title', key: 'title' },
      { property: 'og:description', key: 'description' },
      { property: 'og:image', key: 'image' },
      { property: 'og:url', key: 'url' },
      { property: 'og:site_name', key: 'siteName' },
      { property: 'og:type', key: 'type' },
    ];

    for (const tag of metaTags) {
      const match = html.match(new RegExp(`<meta[^>]+property="${tag.property}"[^>]+content="([^"]+)"`, 'i'));
      if (match) result[tag.key] = match[1];
    }

    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
