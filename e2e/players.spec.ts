import { test, expect } from "@playwright/test";

test.describe("/players", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/players");
  });

  test("renders heading and player count", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Jogadores");
    await expect(page.locator("text=atletas")).toBeVisible();
  });

  test("renders 60 player cards on first page", async ({ page }) => {
    const ageTexts = page.locator(".rounded-\\[20px\\]").filter({ hasText: /\d+ anos/ });
    await expect(ageTexts).toHaveCount(60);
  });

  test("search by player name filters results", async ({ page }) => {
    await page.locator("input[placeholder='Buscar jogador...']").fill("Bellingham");
    await expect(page.locator("text=Nenhum jogador encontrado")).not.toBeVisible();
    // At least one result — count badge reflects filtered total
    await expect(page.locator("text=jogador").first()).toBeVisible();
  });

  test("position filter Goleiro shows only GR badges", async ({ page }) => {
    await page.getByRole("button", { name: "Goleiro", exact: true }).click();
    await expect(page.locator("text=GR").first()).toBeVisible();
    await expect(page.locator("text=Goleiro").first()).toBeVisible();
  });

  test("active position button gets gold highlight", async ({ page }) => {
    const ataBtn = page.getByRole("button", { name: "Atacante", exact: true });
    await ataBtn.click();
    await expect(ataBtn).toHaveClass(/bg-\[#C8A96B\]/);

    const gkBtn = page.getByRole("button", { name: "Goleiro", exact: true });
    await expect(gkBtn).not.toHaveClass(/bg-\[#C8A96B\]/);
  });

  test("Todos filter restores full list", async ({ page }) => {
    await page.getByRole("button", { name: "Goleiro", exact: true }).click();
    await page.getByRole("button", { name: "Todos", exact: true }).click();

    const ageTexts = page.locator(".rounded-\\[20px\\]").filter({ hasText: /\d+ anos/ });
    await expect(ageTexts).toHaveCount(60);
  });

  test("pagination next/prev controls work", async ({ page }) => {
    const next = page.getByRole("button", { name: "Próximo →" });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page.locator("text=2 /")).toBeVisible();

    await page.getByRole("button", { name: "← Anterior" }).click();
    await expect(page.locator("text=1 /")).toBeVisible();
  });

  test("team crest links navigate to team page", async ({ page }) => {
    const teamLink = page.locator("a[href^='/teams/']").first();
    const href = await teamLink.getAttribute("href");
    await teamLink.click();
    await expect(page).toHaveURL(href!);
  });
});
