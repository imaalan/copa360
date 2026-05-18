import { test, expect } from "@playwright/test";

test.describe("/matches", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/matches");
  });

  test("renders heading and match count", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Jogos");
    await expect(page.getByText("104 partidas", { exact: true }).first()).toBeVisible();
  });

  test("shows all stage sections by default", async ({ page }) => {
    await expect(page.locator("text=Fase de Grupos")).toBeVisible();
    await expect(page.locator("text=Rodada de 32")).toBeVisible();
    await expect(page.locator("h2").filter({ hasText: /^Final$/ }).first()).toBeVisible();
  });

  test("Grupos tab filters to group stage only", async ({ page }) => {
    await page.getByRole("button", { name: "Grupos", exact: true }).click();

    await expect(page.locator("text=Fase de Grupos")).toBeVisible();
    await expect(page.locator("text=Rodada de 32")).not.toBeVisible();
    await expect(page.getByText("72 partidas", { exact: true })).toBeVisible();
  });

  test("Mata-Mata tab filters to knockout stages", async ({ page }) => {
    await page.getByRole("button", { name: "Mata-Mata", exact: true }).click();

    await expect(page.locator("text=Fase de Grupos")).not.toBeVisible();
    await expect(page.getByText("32 partidas", { exact: true })).toBeVisible();
  });

  test("group dropdown visible for Todos and Grupos, hidden for Mata-Mata", async ({ page }) => {
    const select = page.locator("select");
    await expect(select).toBeVisible();

    await page.getByRole("button", { name: "Grupos", exact: true }).click();
    await expect(select).toBeVisible();

    await page.getByRole("button", { name: "Mata-Mata", exact: true }).click();
    await expect(select).not.toBeVisible();
  });

  test("group dropdown filters to Grupo A (6 matches)", async ({ page }) => {
    await page.getByRole("button", { name: "Grupos", exact: true }).click();
    await page.locator("select").selectOption({ label: "Grupo A" });

    await expect(page.getByText("6 partidas", { exact: true })).toBeVisible();
    await expect(page.locator("text=Fase de Grupos")).toBeVisible();
  });

  test("each match card shows VS", async ({ page }) => {
    await expect(page.locator("text=VS").first()).toBeVisible();
  });

  test("Agendado badge appears on upcoming matches", async ({ page }) => {
    await expect(page.locator("text=Agendado").first()).toBeVisible();
  });

  test("match times show BRT label", async ({ page }) => {
    await expect(page.locator("text=BRT").first()).toBeVisible();
  });

  test("Todos tab restores all 104 matches", async ({ page }) => {
    await page.getByRole("button", { name: "Grupos", exact: true }).click();
    await expect(page.getByText("72 partidas", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await expect(page.getByText("104 partidas", { exact: true }).first()).toBeVisible();
  });
});
