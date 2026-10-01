import { test, expect } from '@playwright/test';

test.describe('User exploration loop', () => {
  test('deep feature exploration', async ({ page }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    const locked = await page.locator('.input-field[type="password"]').count();
    if (locked > 0) {
      await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
      await page.getByRole('button', { name: 'Unlock' }).click();
      await page.waitForTimeout(1000);
    }

    // 1. Feed
    await expect(page.locator('.logo')).toHaveText('TSL');
    const followingTab = page.locator('.feed-tabs .btn:has-text("Following")');
    if (await followingTab.count() > 0) {
      await followingTab.click();
      await page.waitForTimeout(500);
    }

    // 2. Compose post with poll and media
    await page.goto('/#/compose');
    await page.waitForTimeout(500);
    await page.getByPlaceholder("What's happening?").fill('E2E exploration post');
    await page.getByPlaceholder('Poll question').fill('Best feature?');
    const optionInputs = page.locator('.input-field[placeholder="Option 1"], .input-field[placeholder="Option 2"]');
    if (await optionInputs.count() >= 2) {
      await optionInputs.nth(0).fill('Polls');
      await optionInputs.nth(1).fill('Media');
    }
    await page.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(1000);

    // 3. Search posts
    await page.goto('/#/search');
    await page.waitForTimeout(500);
    const searchInput = page.locator('.input-field[placeholder="Search..."]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('E2E');
      await page.waitForTimeout(500);
    }

    // 4. Profile
    await page.goto('/#/profile');
    await page.waitForTimeout(500);
    await expect(page.locator('main.content-area')).toBeVisible();

    // 5. Notifications
    await page.goto('/#/notifications');
    await page.waitForTimeout(500);
    expect(await page.textContent('body')).toMatch(/Alerts/);

    // 6. DMs inbox
    await page.goto('/#/dms');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Inbox');

    // 7. Settings
    await page.goto('/#/settings');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Configuration');

    // 8. Models
    await page.goto('/#/models');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('HF Models Hub');

    // 9. Back to feed and verify no JS errors
    await page.goto('/#/');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });
});
