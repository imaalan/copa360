import { expect, test, type Locator, type Page } from "@playwright/test";

const POSITION_BUTTON_NAMES = ["Todos", "Goleiro", "Defensor", "Meia", "Atacante"] as const;

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("copa360_splash_seen", "1");
    });

    await page.goto("/players");
  });

  test("CA-01 renders the five position buttons on mobile", async ({ page }) => {
    for (const name of POSITION_BUTTON_NAMES) {
      await expect(getPositionButton(page, name)).toBeVisible();
    }
  });

  test("CA-02 keeps the position filter container scrollable on mobile", async ({ page }) => {
    const container = await getPositionFilterContainer(page);

    const overflowX = await container.evaluate((node) => getComputedStyle(node).overflowX);

    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("CA-03 keeps the active position filter styling intact", async ({ page }) => {
    const goalieButton = getPositionButton(page, "Goleiro");

    await goalieButton.click();

    await expect(goalieButton).toHaveClass(/bg-\[#C8A96B\]/);
  });
});

function getPositionButton(page: Page, name: (typeof POSITION_BUTTON_NAMES)[number]): Locator {
  return page.getByRole("button", { name, exact: true });
}

async function getPositionFilterContainer(page: Page): Promise<Locator> {
  const firstButton = getPositionButton(page, POSITION_BUTTON_NAMES[0]);
  const container = firstButton.locator("..");

  await expect(container).toBeVisible();
  return container;
}
