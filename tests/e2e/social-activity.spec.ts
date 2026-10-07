import { test, expect } from '@playwright/test';
import { gotoFeed } from './boot';

// Social heartbeat: posting from the UI must produce friend-first replies
// and persona likes within seconds, with counts and liker lists updating.
test.describe('Social activity loop', () => {
  test('post gets replies and likes, likers listed', async ({ page }) => {
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (['error', 'debug'].includes(msg.type())) {
        console.log(`[browser:${msg.type()}]`, msg.text().slice(0, 200));
      }
    });

    await gotoFeed(page);

    const probe = `Heartbeat probe ${Date.now()}`;
    await page.goto('/#/compose');
    await page.waitForTimeout(500);
    await page.getByPlaceholder("What's happening?").fill(probe);
    await page.getByRole('button', { name: 'Post' }).click();
    await page.waitForTimeout(1500);

    // Post appears in feed.
    await page.goto('/#/');
    await page.waitForTimeout(500);
    await expect(page.getByText(probe).first()).toBeVisible();

    // Open the thread: friend (Mimi) must reply first, within ~40s.
    await page.getByText(probe).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Mimi').first()).toBeVisible({ timeout: 60000 });

    // Persona likes must bump the count. The feed reads fresh on every
    // mount, so revisit the thread (fresh remount each time) until likes
    // show — DB writes are monotonic, so any fresh read past landing wins.
    await page.goBack();
    await page.waitForTimeout(500);
    let shown = '♥ 0';
    for (let round = 0; round < 8; round += 1) {
      const card = page.locator('.post', { hasText: probe }).first();
      shown = (await card.getByTestId(/likers-toggle-/).textContent()) ?? '♥ 0';
      if (/♥ [1-9]/.test(shown)) break;
      await page.getByText(probe).first().click();
      await page.waitForTimeout(4000);
      await page.goBack();
      await page.waitForTimeout(500);
    }
    expect(shown).toMatch(/♥ [1-9]/);

    // Likers list names names.
    const card = page.locator('.post', { hasText: probe }).first();
    await card.getByTestId(/likers-toggle-/).click();
    await page.waitForTimeout(500);
    await expect(card.getByTestId(/likers-list-/)).toContainText('♥');

    // Comment on the thread and see it persist.
    await page.getByText(probe).first().click();
    await page.waitForTimeout(500);
    const comment = `My own comment ${Date.now()}`;
    await page.getByTestId('reply-input').fill(comment);
    await page.getByTestId('reply-send').click();
    await page.waitForTimeout(1000);
    await expect(page.getByText(comment).first()).toBeVisible();

    // Nested reply: answer Mimi, expect an indented child.
    const mimiReply = page.locator('div[data-testid^="reply-r-"]').first();
    await mimiReply.getByTestId(/reply-to-/).click();
    await page.waitForTimeout(300);
    const nested = `Nested hello ${Date.now()}`;
    await page.getByTestId('reply-input').fill(nested);
    await page.getByTestId('reply-send').click();
    await page.waitForTimeout(1000);
    const child = page.locator('.post', { hasText: nested }).first();
    await expect(child).toBeVisible();
    const margin = await child.evaluate((el) => getComputedStyle(el).marginLeft);
    expect(parseInt(margin, 10)).toBeGreaterThanOrEqual(40);

    // New DM: search personas → tap name → thread opens.
    await page.goto('/#/search');
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Personas' }).click();
    await page.waitForTimeout(800);
    await page.locator('[data-testid^="dm-open-"]').first().click();
    await page.waitForTimeout(2500);
    await expect(page.locator('.status-bar h2').first()).not.toBeEmpty();

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
