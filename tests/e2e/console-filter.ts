// Shared console-noise filter for E2E specs.
// Browsers log network-level failures (CORS-blocked third-party fetches,
// aborted preloads, offline dev-server quirks) even when the app catches
// and handles them. Those are environmental noise, not app bugs — filter
// them so specs assert on real app errors and uncaught exceptions.
import type { Page } from '@playwright/test';

const BENIGN_PATTERNS = [
  'jeep-sqlite',
  'CORS policy',
  'Failed to load resource',
  'ERR_FAILED',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_CONNECTION_REFUSED',
  'net::',
  'React Router Future Flag Warning',
  '[vite]',
];

export function isBenignConsoleMessage(text: string): boolean {
  return BENIGN_PATTERNS.some((p) => text.includes(p));
}

export function attachErrorCollectors(page: Page): { consoleErrors: string[]; pageErrors: string[] } {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isBenignConsoleMessage(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  return { consoleErrors, pageErrors };
}
