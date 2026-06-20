import { test, expect } from '@playwright/test';

test.describe('Onde Assistir', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('copa360_splash_seen', '1'));
  });

  test('CA-06 pagina /onde-assistir exibe os 4 broadcasters', async ({ page }) => {
    await page.goto('/onde-assistir');
    await expect(page.getByText('Globo')).toBeVisible();
    await expect(page.getByText('SporTV')).toBeVisible();
    await expect(page.getByText(/Caz.+TV/)).toBeVisible();
    await expect(page.getByText('FIFA+')).toBeVisible();
  });

  test('CA-07 NavHeader desktop tem link Onde Assistir', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Onde Assistir' })).toBeVisible();
  });

  test('CA-07 NavHeader mobile tem link Onde Assistir no menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: /menu|hamburger|abrir/i }).click();
    await expect(page.getByRole('link', { name: 'Onde Assistir' })).toBeVisible();
  });
});
