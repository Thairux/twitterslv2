import { test, expect } from '@playwright/test';

// 3.0.0 surfaces: providers page, inference policy, reply audience.
test.describe('#tslp admin', () => {
  test('providers page, policy controls, and audience selector', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/#/providers');
    await expect(page.getByTestId('providers-page')).toBeVisible();
    await page.getByTestId('profile-name-input').fill('E2E Kilo');
    await page.getByTestId('profile-add').click();
    await expect(page.getByText('E2E Kilo')).toBeVisible();

    await page.goto('/#/settings');
    await expect(page.getByTestId('policy-strict')).toBeVisible();
    await expect(page.getByTestId('policy-hybrid')).toBeVisible();
    await expect(page.getByTestId('validate-btn')).toBeVisible();

    await page.goto('/#/compose');
    await expect(page.getByTestId('audience-followed')).toBeVisible();
    await expect(page.getByTestId('audience-mentioned')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
