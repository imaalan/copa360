import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeAll(async ({ browser }) => {
    // Pre-warm all nav targets so Next.js dev server compiles their JS chunks.
    // Without this, client-side navigation fails with ChunkLoadError on first access.
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    for (const route of ["/teams", "/players", "/matches", "/stats"]) {
      await p.goto(route).catch(() => {});
      await p.waitForLoadState("load").catch(() => {});
    }
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");
  });

  test("header renders COPA360 logo linking to home", async ({ page }) => {
    const logo = page.locator("header a", { hasText: "COPA" });
    await expect(logo).toBeVisible();
    await logo.click();
    await expect(page).toHaveURL("/");
  });

  test("nav link Seleções navigates to /teams", async ({ page }) => {
    await page.locator("nav a", { hasText: "Seleções" }).click();
    await expect(page).toHaveURL("/teams");
    await expect(page.locator("h1")).toContainText("Seleções", { timeout: 10000 });
  });

  test("nav link Jogadores navigates to /players", async ({ page }) => {
    await page.locator("nav a", { hasText: "Jogadores" }).click();
    await expect(page).toHaveURL("/players");
    await expect(page.locator("h1")).toContainText("Jogadores");
  });

  test("nav link Jogos navigates to /matches", async ({ page }) => {
    await page.locator("nav a", { hasText: "Jogos" }).click();
    await expect(page).toHaveURL("/matches");
    await expect(page.locator("h1")).toContainText("Jogos");
  });

  test("nav link Estatísticas navigates to /stats", async ({ page }) => {
    await page.locator("nav a", { hasText: "Estatísticas" }).click();
    await expect(page).toHaveURL("/stats");
    await expect(page.locator("h1")).toContainText("Estatísticas", { timeout: 10000 });
  });
});
