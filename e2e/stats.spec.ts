import { test, expect } from "@playwright/test";

test.describe("/stats", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/stats");
  });

  test("renders heading", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Estatísticas");
  });

  test("hero numbers: 48 seleções, 1213 jogadores, 104 jogos, 3 países", async ({ page }) => {
    await expect(page.getByText("Seleções", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Jogadores", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Jogos", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Países-sede", { exact: true })).toBeVisible();
  });

  test("position distribution renders all four groups", async ({ page }) => {
    await expect(page.locator("text=Distribuição por Posição")).toBeVisible();
    for (const pos of ["Goleiros", "Defensores", "Meias", "Atacantes"]) {
      await expect(page.locator("text=" + pos).first()).toBeVisible();
    }
  });

  test("age section shows youngest and oldest squad lists", async ({ page }) => {
    await expect(page.locator("text=Elencos por Idade Média")).toBeVisible();
    await expect(page.locator("text=Mais Jovens").first()).toBeVisible();
    await expect(page.locator("text=Mais Experientes").first()).toBeVisible();
  });

  test("squad sizes section renders all 48 teams as bar rows", async ({ page }) => {
    await expect(page.locator("text=Tamanho dos Elencos")).toBeVisible();
    const section = page.locator("text=Tamanho dos Elencos").locator("..").locator("..");
    const rows = section.locator("a[href^='/teams/']");
    await expect(rows).toHaveCount(48);
  });

  test("squad links navigate to team detail page", async ({ page }) => {
    const section = page.locator("text=Tamanho dos Elencos").locator("..").locator("..");
    const firstLink = section.locator("a[href^='/teams/']").first();
    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await expect(page).toHaveURL(href!);
  });

  test("player age tables render 5 rows each (10 total age labels)", async ({ page }) => {
    await expect(page.locator("text=Jogadores Mais Velhos")).toBeVisible();
    await expect(page.locator("text=Jogadores Mais Jovens")).toBeVisible();
    await expect(page.locator("text=anos")).toHaveCount(10);
  });
});
