import { test, expect } from '@playwright/test';
import { attachErrorCollectors } from './console-filter';

test.describe('Gap validation loop', () => {
  test('validate fixes from critique', async ({ page }) => {
    test.setTimeout(120000);
    const { consoleErrors: errors, pageErrors } = attachErrorCollectors(page);

    await page.goto('/');
    const locked = await page.locator('.input-field[type="password"]').count();
    if (locked > 0) {
      await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
      await page.getByRole('button', { name: 'Unlock' }).click();
      await page.waitForTimeout(1000);
    }

    // Feed tab switch should not crash and should load posts
    await expect(page.locator('.logo')).toHaveText('TSL');
    const followingTab = page.locator('.feed-tabs .btn:has-text("Following")');
    if (await followingTab.count() > 0) {
      await followingTab.click();
      await page.waitForTimeout(500);
      expect(await page.textContent('body')).toMatch(/TSL/);
    }

    // Search should not crash and should render results area
    await page.goto('/#/search');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Search');

    // Profile should render without error
    await page.goto('/#/profile');
    await page.waitForTimeout(500);
    await expect(page.locator('main.content-area')).toBeVisible();

    // Notifications settings should render
    await page.goto('/#/notifications');
    await page.waitForTimeout(500);
    expect(await page.textContent('body')).toMatch(/Alerts/);

    // DMs inbox should render
    await page.goto('/#/dms');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Inbox');

    // Settings should render simulation controls
    await page.goto('/#/settings');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Configuration');

    // Models should render
    await page.goto('/#/models');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('HF Models Hub');

    // Back to feed, assert no JS errors
    await page.goto('/#/');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
