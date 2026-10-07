import { test, expect } from '@playwright/test';
import { attachErrorCollectors } from './console-filter';
import { gotoFeed } from './boot';

// #tslp admin panel: grid, dashboards, friend creator, provider templates.
test.describe('#tslp admin', () => {
  test('grid, stats, and friend creation flow', async ({ page }) => {
    test.setTimeout(180000);
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);

    await gotoFeed(page);

    await page.goto('/#/tslp');
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-testid="tslp-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="tslp-grid"]')).toBeVisible();
    expect(await page.locator('[data-testid^="tslp-card-"]').count()).toBeGreaterThan(5);

    // Open a persona detail and its island-DM tab.
    await page.locator('[data-testid^="tslp-card-"]').first().click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid^="tslp-detail-"]').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 10);
    await page.waitForTimeout(500);

    // Dashboards render today counts.
    await page.getByTestId('tslp-tab-dashboards').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="tslp-global-stats"]')).toBeVisible();

    // Friend creator: describe → preview → confirm → lands in the DM thread.
    await page.getByTestId('tslp-tab-create').click();
    await page.waitForTimeout(500);
    await page.getByTestId('friend-desc').fill('a warm lighthouse keeper who tells gentle stories');
    await page.getByTestId('friend-generate').click();
    await expect(page.locator('[data-testid="friend-preview"]')).toBeVisible({ timeout: 60000 });
    await page.getByTestId('friend-confirm').click();
    await page.waitForTimeout(3000);
    await expect(page.locator('.status-bar h2').first()).not.toBeEmpty({ timeout: 15000 });

    // Provider profiles live on their own page now.
    await page.goto('/#/providers');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="providers-page"]')).toBeVisible();
    await page.getByTestId('profile-name-input').fill('E2E Provider');
    await page.getByTestId('profile-add').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('E2E Provider').first()).toBeVisible();

    expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
