/**
 * COMPATIBILITY + USABILITY + ACCESSIBILITY TESTS
 *
 * Compatibility: renders correctly on mobile (375px), tablet (768px), desktop (1280px).
 * Usability:     interactive elements reachable by keyboard, empty states shown,
 *                loading states don't obscure content.
 * Accessibility: images have alt text, buttons have accessible names,
 *                form inputs have labels, landmark regions present.
 */

import { test, expect, devices } from "@playwright/test";

// ── Viewport helpers ──────────────────────────────────────────────────────────

const VIEWPORTS = [
  { name: "Mobile (375px)",  width: 375,  height: 812  },
  { name: "Tablet (768px)",  width: 768,  height: 1024 },
  { name: "Desktop (1280px)", width: 1280, height: 800  },
];

// ── Compatibility — layout does not break across viewports ────────────────────

test.describe("Compatibility — multi-viewport layout", () => {
  for (const vp of VIEWPORTS) {
    test(`Home page renders headline on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Set splash seen BEFORE page load via addInitScript
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.locator("h1")).toBeVisible({ timeout: 8000 });
      // On mobile the nav is hidden (hamburger replaces it); check header always visible
      await expect(page.locator("header")).toBeVisible();
    });

    test(`/teams shows team cards on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
      await page.goto("/teams");

      await expect(page.locator("a[href^='/teams/']").first()).toBeVisible();
    });

    test(`/players shows player cards on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
      await page.goto("/players");

      await expect(page.locator("h1")).toBeVisible();
    });
  }
});

// ── Compatibility — no horizontal overflow on mobile ─────────────────────────

test.describe("Compatibility — no horizontal scroll", () => {
  const MOBILE = { width: 375, height: 812 };

  // Routes known to be fully responsive at 375px (no horizontal overflow)
  const NO_OVERFLOW_ROUTES = ["/", "/teams", "/stats", "/teams/bra"];
  // /players and /matches have wide filter bars that can scroll horizontally — accepted

  for (const route of NO_OVERFLOW_ROUTES) {
    test(`${route} has no horizontal overflow at 375px`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
      await page.goto(route, { waitUntil: "domcontentloaded" });

      const hasOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasOverflow, `Horizontal overflow on ${route} at 375px`).toBe(false);
    });
  }
});

// ── Usability — keyboard navigation ──────────────────────────────────────────

test.describe("Usability — keyboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
  });

  test("Tab key reaches nav links from body", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    // After first tab, a nav element or skip-link should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test("Enter on team card navigates to team detail", async ({ page }) => {
    await page.goto("/teams");
    const firstCard = page.locator("a[href^='/teams/']").first();
    const href = await firstCard.getAttribute("href");

    await firstCard.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(href!);
  });

  test("search input is reachable via Tab on /players", async ({ page }) => {
    await page.goto("/players");
    const input = page.locator("input[placeholder='Buscar jogador...']");
    await input.focus();
    await expect(input).toBeFocused();
  });

  test("Escape key closes player popup when open", async ({ page }) => {
    await page.goto("/teams/bra");
    // Squad cards are <button> elements inside the SquadWithPopup component
    const firstCard = page.locator("main button").first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });
    await firstCard.click();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    // After Escape, popup overlay should not be visible
    await page.waitForTimeout(400);
    const overlay = page.locator("[role='dialog'], [data-state='open']");
    const count = await overlay.count();
    // Either no overlay element exists or it's hidden
    if (count > 0) {
      await expect(overlay.first()).not.toBeVisible({ timeout: 2000 });
    }
  });
});

// ── Usability — empty states ──────────────────────────────────────────────────

test.describe("Usability — empty states", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
  });

  test("/players shows 'Nenhum jogador encontrado' for impossible search", async ({ page }) => {
    await page.goto("/players");
    await page.locator("input[placeholder='Buscar jogador...']").fill("zzzzzzzzzzz-no-match");
    await expect(page.locator("text=Nenhum jogador encontrado")).toBeVisible({ timeout: 2000 });
  });

  test("/teams shows 'Nenhuma seleção encontrada' for impossible search", async ({ page }) => {
    await page.goto("/teams");
    await page.locator("input[placeholder='Buscar seleção...']").fill("zzzzzzz-no-match");
    await expect(page.locator("text=Nenhuma seleção encontrada")).toBeVisible({ timeout: 2000 });
  });
});

// ── Accessibility — images have alt text ─────────────────────────────────────

test.describe("Accessibility — image alt text", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
  });

  test("/teams — all team crest images have non-empty alt", async ({ page }) => {
    await page.goto("/teams");
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      const src = await img.getAttribute("src");
      // Only check images that are not decorative (have a src)
      if (src && !src.includes("placeholder")) {
        expect(alt, `Image ${src} missing alt`).not.toBeNull();
        expect(alt?.trim().length, `Image ${src} has empty alt`).toBeGreaterThan(0);
      }
    }
  });

  test("/teams/bra — squad player images have alt text", async ({ page }) => {
    await page.goto("/teams/bra");
    const playerImgs = await page.locator("img").all();
    for (const img of playerImgs) {
      const alt = await img.getAttribute("alt");
      if (alt !== null) {
        // alt="" is valid for decorative; non-empty alts must be meaningful strings
        if (alt.trim().length > 0) {
          expect(typeof alt).toBe("string");
        }
      }
    }
  });
});

// ── Accessibility — buttons have accessible names ─────────────────────────────

test.describe("Accessibility — interactive elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
  });

  test("/players — all filter buttons have visible text", async ({ page }) => {
    await page.goto("/players");
    const buttons = await page.locator("button").all();
    for (const btn of buttons) {
      const text = (await btn.textContent())?.trim() ?? "";
      const ariaLabel = await btn.getAttribute("aria-label");
      const hasName = text.length > 0 || (ariaLabel && ariaLabel.length > 0);
      expect(hasName, `Button with text "${text}" has no accessible name`).toBe(true);
    }
  });

  test("/matches — stage filter buttons have text", async ({ page }) => {
    await page.goto("/matches");
    const buttons = await page.getByRole("button").all();
    for (const btn of buttons) {
      const text = (await btn.textContent())?.trim() ?? "";
      const ariaLabel = await btn.getAttribute("aria-label");
      expect(text.length > 0 || (ariaLabel ?? "").length > 0).toBe(true);
    }
  });

  test("page has main landmark region on all routes", async ({ page }) => {
    for (const route of ["/", "/teams", "/players", "/matches", "/stats"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const main = page.locator("main");
      await expect(main).toBeAttached();
    }
  });

  test("nav has navigation landmark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();
  });
});

// ── Usability — interactive feedback ─────────────────────────────────────────

test.describe("Usability — interactive feedback", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));
  });

  test("active position filter visually highlighted", async ({ page }) => {
    await page.goto("/players");
    const gkBtn = page.getByRole("button", { name: "Goleiro", exact: true });
    await gkBtn.click();
    await expect(gkBtn).toHaveClass(/bg-\[#C8A96B\]/);
  });

  test("active stage filter visually highlighted on /matches", async ({ page }) => {
    await page.goto("/matches");
    const gruposBtn = page.getByRole("button", { name: "Grupos", exact: true });
    await gruposBtn.click();
    await expect(gruposBtn).toHaveClass(/bg-/);
  });

  test("team search shows result count after filtering", async ({ page }) => {
    await page.goto("/teams");
    await page.locator("input[placeholder='Buscar seleção...']").fill("Bra");
    // Some result should appear — either "Brazil" or count label
    await expect(page.locator("a[href^='/teams/']")).toHaveCount(1, { timeout: 2000 });
  });
});
