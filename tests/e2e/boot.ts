import { expect, type Page } from '@playwright/test';

/** Boot to the feed on a fresh profile: unlock + first-run onboarding. */
export async function gotoFeed(page: Page): Promise<void> {
  await page.goto('/');
  const locked = await page.locator('.input-field[type="password"]').count();
  if (locked > 0) {
    await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.waitForTimeout(1000);
  }
  // Fresh boots seed + migrate before first paint — wait for either
  // onboarding or the feed shell before deciding.
  await expect(page.locator('.feed-tabs, :text("Welcome to TSL")').first()).toBeVisible({ timeout: 120000 });
  if ((await page.getByText('Welcome to TSL').count()) > 0) {
    const boxes = page.locator('input[type="checkbox"]');
    await boxes.nth(0).check({ force: true });
    await boxes.nth(1).check({ force: true });
    await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled({ timeout: 15000 });
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Get Started' }).click();
  }
  await expect(page.locator('.feed-tabs')).toBeVisible({ timeout: 60000 });
  await page.waitForTimeout(1000);
}
