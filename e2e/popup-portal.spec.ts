import { expect, test } from "@playwright/test";

test.describe("popup portal fix", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await page.goto("/teams/bra");
  });

  test("CA1 renders popup as a direct child of body", async ({ page }) => {
    await page.locator("main button").last().click();
    await expect(page.locator(".fixed.inset-0").first()).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const el = document.querySelector(".fixed.inset-0");
          return !!el && el.parentElement === document.body;
        }),
      )
      .toBe(true);
  });

  test("CA2 backdrop covers the viewport after scrolling to bottom", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator("main button").last().click();

    const box = await page.locator(".fixed.inset-0").first().boundingBox();
    expect(box).toBeTruthy();

    const viewport = page.viewportSize()!;
    expect(Math.abs(box!.top)).toBeLessThan(2);
    expect(Math.abs(box!.left)).toBeLessThan(2);
    expect(Math.abs(box!.width - viewport.width)).toBeLessThan(2);
    expect(Math.abs(box!.height - viewport.height)).toBeLessThan(2);
  });

  test("CA4 closes popup when clicking backdrop", async ({ page }) => {
    await page.locator("main button").last().click();
    await expect(page.locator(".fixed.inset-0").first()).toBeVisible();
    await page.locator(".fixed.inset-0").first().click({ position: { x: 4, y: 4 } });
    await expect(page.locator(".fixed.inset-0")).toHaveCount(0);
  });
});
