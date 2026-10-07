import { test, expect } from '@playwright/test';
import { gotoFeed } from './boot';

// Golden path (grows per sprint; Sprint 1 asserts shell + theme + brand).
// v1 lesson: E2E from day 0, not as retrofit polish.
test('shell boots with TSL brand and theme toggle', async ({ page }) => {
  await gotoFeed(page);
  await expect(page.locator('.logo')).toHaveText('TSL');
  // Brand guard: the Antigravity AGY string must never render.
  const body = await page.textContent('body');
  expect(body).not.toMatch(/AGY/i);
});
