import { test, expect } from '@playwright/test';

// Golden path (grows per sprint; Sprint 1 asserts shell + theme + brand).
// v1 lesson: E2E from day 0, not as retrofit polish.
test('shell boots with TSL brand and theme toggle', async ({ page }) => {
  await page.goto('/');
  const locked = await page.locator('.input-field[type="password"]').count();
  if (locked > 0) {
    await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForTimeout(1000);
  }
  await expect(page.locator('.logo')).toHaveText('TSL');
  // Brand guard: the Antigravity AGY string must never render.
  const body = await page.textContent('body');
  expect(body).not.toMatch(/AGY/i);
});
