import { test, expect } from '@playwright/test';

test.describe('Brincar de Tecnico', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('copa360_splash_seen', '1'));
  });

  test('CA-08 NavHeader tem pill com link externo para 7a0.com.br', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('a[href="https://7a0.com.br/"]').first();
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('target', '_blank');
  });

  test('CA-09 home tem card 7a0 com texto Role o dado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Role o dado')).toBeVisible();
    await expect(page.locator('a[href="https://7a0.com.br/"]').first()).toBeVisible();
  });

  test('CA-05a MatchCard exibe link de streaming quando ha streamingLinks', async ({ page }) => {
    await page.goto('/matches');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(page.getByRole('link', { name: /Assistir ao vivo|Rever jogo/ }).first()).toBeVisible();
  });

  test('CA-05b MatchCard exibe link Rever jogo para jogo FINISHED com streamingLinks', async ({ page }) => {
    await page.goto('/matches');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(page.getByRole('link', { name: /Rever jogo/ }).first()).toBeVisible();
  });
});
