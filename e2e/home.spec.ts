import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto("/");
  });

  test("renders splash screen on first visit", async ({ page }) => {
    await expect(page.locator("text=FIFA World Cup 2026").first()).toBeVisible();
    await expect(page.locator("text=COPA").first()).toBeVisible();
    await expect(page.locator("text=pressione qualquer tecla")).toBeVisible();
  });

  test("splash dismisses on click and does not reappear", async ({ page }) => {
    await page.waitForTimeout(500);
    await page.mouse.click(400, 300);
    await expect(page.locator("text=pressione qualquer tecla")).not.toBeVisible({ timeout: 2000 });

    await page.reload();
    await expect(page.locator("text=pressione qualquer tecla")).not.toBeVisible();
  });

  test("shows hero headline after splash", async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("Copa do Mundo");
    // Use the <em> element specifically to avoid ambiguity with splash text
    await expect(page.locator("h1 em")).toContainText("como você nunca viu");
  });

  test("countdown displays four units with numeric values", async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");

    for (const label of ["Dias", "Horas", "Minutos", "Segundos"]) {
      await expect(page.locator(`text=${label}`)).toBeVisible();
    }
    // Countdown numbers must be 2-digit
    const firstNum = page.locator(".tabular-nums").first();
    await expect(firstNum).toHaveText(/^\d{2}$/);
  });

  test("featured players section renders four player cards", async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");

    await expect(page.locator("text=Jogadores em Destaque")).toBeVisible();
    // 4 player cards — each is a Link inside the featured grid
    const featuredSection = page.locator("section").filter({ hasText: "Jogadores em Destaque" });
    await expect(featuredSection.locator("a[href^='/players/']")).toHaveCount(4);
  });

  test("team mosaic renders at least 4 team cards", async ({ page }) => {
    await page.evaluate(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");

    // Mosaic is dynamic — assert first card visible and count ≥ 4
    const mosaicSection = page.locator("section").filter({ hasText: "Seleções" }).last();
    await expect(mosaicSection.locator("a[href^='/teams/']").first()).toBeVisible();
    const count = await mosaicSection.locator("a[href^='/teams/']").count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
