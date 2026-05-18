import { test, expect } from "@playwright/test";

test.describe("/teams", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/teams");
  });

  test("renders page heading and team count", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Seleções");
    await expect(page.getByText("48 equipes", { exact: true })).toBeVisible();
  });

  test("renders 48 team cards", async ({ page }) => {
    await expect(page.locator("a[href^='/teams/']")).toHaveCount(48);
  });

  test("search filters teams by name", async ({ page }) => {
    const input = page.locator("input[placeholder='Buscar seleção...']");
    await input.fill("Brazil");
    await expect(page.locator("a[href^='/teams/']")).toHaveCount(1);
    await expect(page.locator("a[href='/teams/bra']")).toBeVisible();
  });

  test("search filters by TLA", async ({ page }) => {
    const input = page.locator("input[placeholder='Buscar seleção...']");
    await input.fill("ARG");
    await expect(page.locator("a[href='/teams/arg']")).toBeVisible();
  });

  test("clear search button restores all 48 teams", async ({ page }) => {
    const input = page.locator("input[placeholder='Buscar seleção...']");
    await input.fill("xyz-no-match");
    await expect(page.locator("text=Nenhuma seleção encontrada")).toBeVisible();

    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.locator("a[href^='/teams/']")).toHaveCount(48);
  });

  test("clicking a team card navigates to team detail", async ({ page }) => {
    await page.locator("a[href='/teams/bra']").click();
    await expect(page).toHaveURL("/teams/bra");
    await expect(page.locator("h1")).toContainText("Brazil");
  });
});

test.describe("/teams/[slug]", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/teams/bra");
  });

  test("renders team hero with crest and name", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Brazil");
    await expect(page.locator("img[alt='Brazil']")).toBeVisible();
  });

  test("shows team meta stats", async ({ page }) => {
    await expect(page.getByText("País", { exact: true })).toBeVisible();
    await expect(page.locator("main").getByText("Jogadores", { exact: true })).toBeVisible();
  });

  test("renders squad grouped by position", async ({ page }) => {
    for (const group of ["Goleiros", "Defensores", "Meias", "Atacantes"]) {
      await expect(page.locator(`text=${group}`)).toBeVisible();
    }
  });

  test("each goalkeeper card shows GR badge", async ({ page }) => {
    await expect(page.locator("text=GR").first()).toBeVisible();
  });

  test("breadcrumb Seleções link returns to /teams", async ({ page }) => {
    await page.locator("nav >> text=Seleções").or(
      page.locator("a[href='/teams']").first()
    ).click();
    await expect(page).toHaveURL("/teams");
  });

  test("returns 404 for unknown slug", async ({ page }) => {
    const res = await page.goto("/teams/zzz-not-a-team");
    expect(res?.status()).toBe(404);
  });
});
