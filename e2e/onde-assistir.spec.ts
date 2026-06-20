import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('copa360_splash_seen', '1'));
  await page.goto('/onde-assistir');
});

test('renderiza os 4 broadcasters com links externos', async ({ page }) => {
  for (const name of ['Globo', 'SporTV', 'CazeTV', 'FIFA+']) {
    await expect(page.getByRole('link', { name })).toBeVisible();
    await expect(page.getByRole('link', { name })).toHaveAttribute('href', /https?:\/\//);
  }
});

test('NavHeader expõe Onde Assistir no desktop e no mobile', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Onde Assistir' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByRole('button', { name: /menu|hamburger|abrir/i }).click();
  await expect(page.getByRole('link', { name: 'Onde Assistir' })).toBeVisible();
});

test('pill externo abre em nova aba', async ({ page }) => {
  await expect(page.locator('a[href="https://7a0.com.br/"]')).toHaveAttribute('target', '_blank');
});
