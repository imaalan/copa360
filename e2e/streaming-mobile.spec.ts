import { expect, test } from '@playwright/test';

async function openMatches(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('copa360_splash_seen', '1');
  });
  await page.goto('/matches');
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
}

test.describe('streaming links on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await openMatches(page);
  });

  test('CA-01 and CA-02: mobile shows a centered streaming link under the card content', async ({ page }) => {
    const link = page.getByRole('link', { name: /Assistir ao vivo|Rever jogo/ }).first();
    const badge = page.getByText(/FINISHED|Finalizado|Encerrado/).first();

    await expect(link).toBeVisible();
    await expect(badge).toBeVisible();

    const [linkBox, badgeBox] = await Promise.all([link.boundingBox(), badge.boundingBox()]);
    expect(linkBox).not.toBeNull();
    expect(badgeBox).not.toBeNull();
    expect(linkBox!.y).toBeGreaterThan(badgeBox!.y + badgeBox!.height);
    expect(linkBox!.x + linkBox!.width / 2).toBeGreaterThan(390 * 0.35);
    expect(linkBox!.x + linkBox!.width / 2).toBeLessThan(390 * 0.65);
  });

  test('CA-03: mobile does not render streaming links for cards without streamingLinks', async ({ page }) => {
    const streamingLinks = page.getByRole('link', { name: /Assistir ao vivo|Rever jogo/ });
    const linkCount = await streamingLinks.count();
    const cardCount = await page.locator('text=VS').count();

    // Only matches with streamingLinks get a button — far fewer than total cards
    expect(linkCount).toBeLessThan(cardCount);
  });
});

test.describe('streaming links on desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await openMatches(page);
  });

  test('CA-04: desktop keeps the existing streaming link visible on the right side of the card', async ({ page }) => {
    const link = page.getByRole('link', { name: /Assistir ao vivo|Rever jogo/ }).first();
    await expect(link).toBeVisible();

    const box = await link.boundingBox();
    expect(box).not.toBeNull();
    // Link must appear on the right half of the 1280px viewport (ml-auto group)
    expect(box!.x).toBeGreaterThan(1280 * 0.5);
  });
});
