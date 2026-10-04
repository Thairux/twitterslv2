// API: newspaper — lightweight link unfurl/text extraction (Sprint 7 port).
// Returns a best-effort title/description for a URL; never throws on failure.

export interface NewspaperResult {
  title?: string;
  description?: string;
  error?: string;
}

export async function unfurl(url: string, timeoutMs = 10_000): Promise<NewspaperResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    // Best-effort fetch of the page HTML; parsing is intentionally minimal
    // because full newspaper extraction is a larger dependency.
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const title = extractTag(text, 'title');
    const description = extractTag(text, 'meta[name="description"]') || extractTag(text, 'meta[property="og:description"]');
    return { title, description };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function extractTag(html: string, selector: string): string | undefined {
  if (selector.startsWith('meta[')) {
    const match = html.match(new RegExp(`<meta[^>]+(?:name|property)="${selector.replace(/meta\[|"|\]/g, '')}"[^>]+content="([^"]+)"`, 'i'));
    if (match) return match[1];
    return undefined;
  }
  const match = html.match(new RegExp(`<${selector}>([^<]+)</${selector}>`, 'i'));
  return match ? match[1].trim() : undefined;
}
