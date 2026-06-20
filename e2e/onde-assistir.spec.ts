import { expect, test } from '@playwright/test';

test('onde assistir', async ({ page }) => {
  await page.goto('/matches');
  await expect(page.getByText('Cazé TV')).toBeVisible();
});
