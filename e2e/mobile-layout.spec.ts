import { expect, test } from '@playwright/test';

test.describe('mobile layout acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('copa360_splash_seen', '1'));
  });

  test('CA-02 /players position filter container is horizontally scrollable on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/players');

    // O container direto dos botões de posição deve ter overflow-x auto ou scroll
    // para que o usuário possa deslizar horizontalmente no mobile.
    const container = page
      .getByRole('button', { name: 'Todos', exact: true })
      .locator('xpath=parent::*');
    const overflowX = await container.evaluate((el) => getComputedStyle(el).overflowX);
    expect(['auto', 'scroll']).toContain(overflowX);
  });

  test('CA-03 stacks /stats age cards vertically on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/stats');

    const oldestCard = page
      .getByText('Jogadores Mais Velhos', { exact: false })
      .locator('xpath=ancestor::div[1]');
    const youngestCard = page
      .getByText('Jogadores Mais Jovens', { exact: false })
      .locator('xpath=ancestor::div[1]');

    const oldestBox = await oldestCard.boundingBox();
    const youngestBox = await youngestCard.boundingBox();

    expect(oldestBox).not.toBeNull();
    expect(youngestBox).not.toBeNull();
    expect(oldestBox!.width).toBeGreaterThanOrEqual(340);
    expect(youngestBox!.width).toBeGreaterThanOrEqual(340);
  });
});
