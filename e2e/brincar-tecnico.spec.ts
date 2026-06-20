import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('CA-09', async ({ page }) => {
  await expect(page.locator('a[href="https://7a0.com.br/"]')).toBeVisible();
  await expect(page.getByText('Role o dado')).toBeVisible();
});

test('MatchCard 1', async ({ page }) => {
  await page.goto('/matches');
  await expect(page.getByRole('button', { name: 'Assistir' })).toBeVisible();
});

test('MatchCard 2', async ({ page }) => {
  await page.goto('/matches');
  await expect(page.getByRole('button', { name: 'Assistir' })).toBeVisible();
});

test('MatchCard 3', async ({ page }) => {
  await page.goto('/matches');
  await expect(page.getByRole('button', { name: 'Assistir' })).toBeVisible();
});
