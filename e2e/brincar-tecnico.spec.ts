import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('copa360_splash_seen', '1'));
  await page.goto('/');
});

test('card home do 7a0.com.br fica entre FEATURED PLAYERS e TEAM MOSAIC', async ({ page }) => {
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.indexOf('FEATURED PLAYERS')).toBeLessThan(bodyText.indexOf('Role o dado'));
  expect(bodyText.indexOf('Role o dado')).toBeLessThan(bodyText.indexOf('TEAM MOSAIC'));
  await expect(page.getByRole('link', { name: 'Role o dado' })).toHaveAttribute(
    'href',
    'https://7a0.com.br/',
  );
});

test('MatchCard mostra Assistir ao vivo quando há streamingLinks e o jogo está IN_PLAY', async ({
  page,
}) => {
  await expect(page.getByRole('button', { name: 'Assistir ao vivo' })).toBeVisible();
});

test('MatchCard mostra Rever jogo quando há streamingLinks e o jogo está FINISHED', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Rever jogo' })).toBeVisible();
});

test('MatchCard nao mostra Assistir quando o jogo esta POSTPONED ou sem streamingLinks', async ({
  page,
}) => {
  await expect(page.getByRole('button', { name: 'Assistir ao vivo' })).toHaveCount(0);
});
