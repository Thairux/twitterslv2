import { test, expect } from '@playwright/test';
import { attachErrorCollectors } from './console-filter';

test.describe('Feature exploration loop', () => {
  test('explore polls media quote edit settings', async ({ page }) => {
    test.setTimeout(120000);
    const { consoleErrors: errors, pageErrors } = attachErrorCollectors(page);

    await page.goto('/');
    const locked = await page.locator('.input-field[type="password"]').count();
    if (locked > 0) {
      await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
      await page.getByRole('button', { name: 'Unlock' }).click();
      await page.waitForTimeout(1000);
    }

    // Create post with poll
    await page.goto('/#/compose');
    await page.waitForTimeout(500);
    await page.getByPlaceholder("What's happening?").fill('Poll test post');
    await page.getByPlaceholder('Poll question').fill('Favorite feature?');
    const optionInputs = page.locator('.input-field[placeholder="Option 1"], .input-field[placeholder="Option 2"]');
    if (await optionInputs.count() >= 2) {
      await optionInputs.nth(0).fill('Polls');
      await optionInputs.nth(1).fill('Media');
    }
    await page.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(1000);

    // Verify post appears in feed
    await page.goto('/#/');
    await page.waitForTimeout(500);
    expect(await page.textContent('body')).toMatch(/Poll test post/);

    // Search
    await page.goto('/#/search');
    await page.waitForTimeout(500);
    const searchInput = page.locator('.input-field[placeholder="Search..."]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('Poll');
      await page.waitForTimeout(500);
    }

    // Settings
    await page.goto('/#/settings');
    await page.waitForTimeout(500);
    const muteInput = page.locator('.input-field[placeholder="Add word to mute..."]');
    if (await muteInput.count() > 0) {
      await muteInput.fill('test');
      await page.locator('.btn:has-text("Add")').click();
      await page.waitForTimeout(500);
    }

    // Models
    await page.goto('/#/models');
    await page.waitForTimeout(500);

    // Back to feed
    await page.goto('/#/');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
