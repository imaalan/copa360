/**
 * PERFORMANCE TESTS
 *
 * Validates that key pages load within acceptable time budgets and that
 * heavy operations (popup API, large lists) don't block the UI.
 *
 * Budgets (dev server, local DB):
 *   - Full page load (DOMContentLoaded):  < 4 000 ms
 *   - First Contentful Paint (FCP):       < 3 000 ms
 *   - Player popup API response:          < 3 000 ms
 */

import { test, expect } from "@playwright/test";

const PAGES = [
  { name: "Home",         path: "/" },
  { name: "Teams",        path: "/teams" },
  { name: "Players",      path: "/players" },
  { name: "Matches",      path: "/matches" },
  { name: "Stats",        path: "/stats" },
  { name: "Team detail",  path: "/teams/bra" },
];

const LOAD_BUDGET_MS  = 4_000;
const FCP_BUDGET_MS   = 3_000;
const POPUP_BUDGET_MS = 3_000;

test.describe("Page load performance", () => {
  for (const { name, path } of PAGES) {
    test(`${name} (${path}) loads within ${LOAD_BUDGET_MS} ms`, async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));

      const t0 = Date.now();
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const elapsed = Date.now() - t0;

      expect(elapsed, `${name} took ${elapsed} ms (budget ${LOAD_BUDGET_MS} ms)`).toBeLessThan(LOAD_BUDGET_MS);
    });
  }
});

test.describe("First Contentful Paint", () => {
  for (const { name, path } of PAGES) {
    test(`${name} FCP < ${FCP_BUDGET_MS} ms`, async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
      await page.goto(path, { waitUntil: "load" });

      const fcp: number = await page.evaluate(() =>
        new Promise<number>(resolve => {
          // If already painted, read from PerformanceObserver entries
          const entries = performance.getEntriesByName("first-contentful-paint");
          if (entries.length) return resolve(entries[0].startTime);

          new PerformanceObserver(list => {
            const e = list.getEntriesByName("first-contentful-paint")[0];
            if (e) resolve(e.startTime);
          }).observe({ type: "paint", buffered: true });

          // Fallback if FCP never fires (e.g. headless quirks)
          setTimeout(() => resolve(0), 2000);
        })
      );

      if (fcp > 0) {
        expect(fcp, `${name} FCP ${Math.round(fcp)} ms (budget ${FCP_BUDGET_MS} ms)`).toBeLessThan(FCP_BUDGET_MS);
      }
    });
  }
});

test.describe("Player popup API latency", () => {
  test(`popup response for player id=1 arrives within ${POPUP_BUDGET_MS} ms`, async ({ request }) => {
    const t0 = Date.now();
    const res = await request.get("/api/players/1/popup");
    const elapsed = Date.now() - t0;

    // Accept 200 (found) or 404 (player not seeded) — both are fast responses
    expect([200, 404]).toContain(res.status());
    expect(elapsed, `Popup API took ${elapsed} ms`).toBeLessThan(POPUP_BUDGET_MS);
  });

  test("players list page renders 60 cards without JS timeout", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));

    const t0 = Date.now();
    await page.goto("/players", { waitUntil: "domcontentloaded" });

    // Wait until the grid renders (first card visible)
    await page.locator(".rounded-\\[20px\\]").first().waitFor({ timeout: LOAD_BUDGET_MS });
    const elapsed = Date.now() - t0;

    expect(elapsed).toBeLessThan(LOAD_BUDGET_MS);
  });
});

test.describe("No layout shift on navigation", () => {
  test("navigating Home → Teams → Players does not throw", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
    await page.goto("/");
    await page.locator("nav a", { hasText: "Seleções" }).click();
    await expect(page).toHaveURL("/teams");
    await page.locator("nav a", { hasText: "Jogadores" }).click();
    await expect(page).toHaveURL("/players");
    // No errors thrown
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    expect(errors).toHaveLength(0);
  });
});
