import { test, expect } from '@playwright/test';

// App exploration: usability + bug hunt. Goal is to discover bugs and verify
// ease of use — every screen must render something meaningful (never blank),
// actions must be reachable without horizontal scrolling, and no uncaught
// JS errors may occur along the way.
test.describe('App exploration (usability bug hunt)', () => {
  test('every hub renders, nothing clips, no JS errors', async ({ page }) => {
    test.setTimeout(180000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    async function unlockIfNeeded() {
      const locked = await page.locator('.input-field[type="password"]').count();
      if (locked > 0) {
        await page.getByPlaceholder('Enter PIN to unlock.').fill('0000');
        await page.getByRole('button', { name: 'Unlock' }).click();
        await page.waitForTimeout(1000);
      }
    }

    async function expectNoHorizontalOverflow() {
      const overflow = await page.evaluate(() => {
        const de = document.documentElement;
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth };
      });
      expect(
        overflow.scrollWidth,
        `horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} at ${page.url()}`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }

    async function expectButtonsNamed() {
      const unnamed = await page.locator('.btn').evaluateAll((els) =>
        els.filter((el) => !(el.textContent ?? '').trim()).length,
      );
      expect(unnamed, 'buttons without accessible text').toBe(0);
    }

    // 1. Feed boots with brand.
    await page.goto('/');
    await unlockIfNeeded();
    await expect(page.locator('.logo')).toHaveText('TSL');
    // Feed shows posts or an explicit empty-state — never a blank page.
    const feedPosts = await page.locator('.post').count();
    const feedEmpty = await page.locator('[data-testid="feed-empty"]').count();
    expect(feedPosts + feedEmpty, 'feed shows posts or empty-state guidance').toBeGreaterThan(0);
    // Compose must be reachable from the feed via the floating button.
    await expect(page.locator('[data-testid="compose-fab"]')).toBeVisible();
    await page.locator('[data-testid="compose-fab"]').click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder("What's happening?")).toBeVisible();
    await page.goto('/#/');
    await page.waitForTimeout(500);
    await expectButtonsNamed();

    // 2. Models hub: every tab must show content, never a blank pane.
    await page.goto('/#/models');
    await page.waitForTimeout(800);
    await expect(page.locator('.page-title')).toHaveText('HF Models Hub');

    await page.getByRole('button', { name: 'Catalogue' }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="catalogue-list"]')).toBeVisible();
    const entries = await page.locator('[data-testid="catalogue-entry"]').count();
    const emptyNote = await page.locator('[data-testid="catalogue-empty"]').count();
    expect(entries + emptyNote, 'catalogue shows entries or an empty-state message').toBeGreaterThan(0);
    // Fresh profile: 4 chat + 4 verified vision models.
    if (emptyNote === 0) {
      expect(entries).toBe(8);
    }
    await expectNoHorizontalOverflow();

    await page.getByRole('button', { name: 'Downloads' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('No downloaded models.')).toBeVisible();
    await expectNoHorizontalOverflow();

    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.getByPlaceholder(/Search HF/)).toBeVisible();
    await expectNoHorizontalOverflow();

    // 3. Settings: model picker must be usable without an endpoint set.
    await page.goto('/#/settings');
    await page.waitForTimeout(800);
    await expect(page.locator('.page-title')).toHaveText('Configuration');
    await expect(page.locator('[data-testid="model-id-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="discover-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-chat-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="run-local-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-model"]')).toContainText('Current selection:');
    // Kilo preset fills the model id in one tap.
    await page.getByRole('button', { name: /Kilo: step-3.7-flash:free/ }).click();
    await expect(page.locator('[data-testid="selected-model"]')).toContainText('stepfun/step-3.7-flash:free');
    // Run-local with no downloads must explain itself, not crash.
    await page.locator('[data-testid="run-local-btn"]').click();
    await page.waitForTimeout(500);
    await expectNoHorizontalOverflow();
    await expectButtonsNamed();

    // 4. DMs inbox renders.
    await page.goto('/#/dms');
    await page.waitForTimeout(500);
    await expect(page.locator('.page-title')).toHaveText('Inbox');

    // 4b. Search is one tap away and suggests islanders to follow.
    await page.goto('/#/');
    await page.waitForTimeout(500);
    await page.locator('.tabbar').getByRole('link', { name: 'Search' }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('.page-title')).toHaveText('Search');
    await page.getByRole('button', { name: 'Personas' }).click();
    await page.waitForTimeout(800);
    const suggestions = await page.locator('[data-testid^="follow-btn-"]').count();
    expect(suggestions, 'persona suggestions with follow buttons').toBeGreaterThan(0);
    await expectNoHorizontalOverflow();

    // 5. Compose → feed round-trip still works.
    await page.goto('/#/compose');
    await page.waitForTimeout(500);
    await page.getByPlaceholder("What's happening?").fill('Exploration usability probe');
    await page.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(1000);
    await page.goto('/#/');
    await page.waitForTimeout(500);
    expect(await page.textContent('body')).toMatch(/Exploration usability probe/);

    expect(pageErrors, `uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  });
});
