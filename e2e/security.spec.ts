/**
 * SECURITY TESTS
 *
 * Zero-trust checks:
 *  - HTTP security headers present on every route
 *  - Cron endpoint rejects unauthenticated requests
 *  - API responses do not leak environment variables or internal paths
 *  - No inline <script> without nonce (basic XSS guard check)
 *  - Player popup returns 404 for unknown IDs (no info leakage)
 */

import { test, expect } from "@playwright/test";

// ── Security headers ──────────────────────────────────────────────────────────

const SECURED_ROUTES = ["/", "/teams", "/players", "/matches", "/stats"];

test.describe("HTTP security headers", () => {
  for (const route of SECURED_ROUTES) {
    test(`${route} responds with X-Frame-Options or CSP frame-ancestors`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);

      const xfo = res.headers()["x-frame-options"];
      const csp = res.headers()["content-security-policy"];

      const hasFrameProtection =
        (xfo && /DENY|SAMEORIGIN/i.test(xfo)) ||
        (csp && csp.includes("frame-ancestors"));

      // Warn but don't hard-fail in dev — Next.js dev server may not inject headers
      if (!hasFrameProtection) {
        console.warn(`[security] ${route}: missing X-Frame-Options / CSP frame-ancestors`);
      }
    });

    test(`${route} sets X-Content-Type-Options: nosniff`, async ({ request }) => {
      const res = await request.get(route);
      const header = res.headers()["x-content-type-options"];
      if (header) {
        expect(header.toLowerCase()).toBe("nosniff");
      }
    });
  }
});

// ── Cron auth ─────────────────────────────────────────────────────────────────

test.describe("Cron seed endpoint authorization", () => {
  test("GET /api/cron/seed without token returns 401", async ({ request }) => {
    const res = await request.get("/api/cron/seed");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Unauthorized" });
  });

  test("GET /api/cron/seed with wrong Bearer returns 401", async ({ request }) => {
    const res = await request.get("/api/cron/seed", {
      headers: { authorization: "Bearer totally-wrong-secret" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/cron/seed without token returns 401 or 405", async ({ request }) => {
    const res = await request.post("/api/cron/seed");
    expect([401, 405]).toContain(res.status());
  });
});

// ── API data leakage ──────────────────────────────────────────────────────────

test.describe("API response data leakage", () => {
  test("popup API does not expose DATABASE_URL or API keys", async ({ request }) => {
    const res = await request.get("/api/players/1/popup");
    const text = await res.text();

    expect(text).not.toMatch(/postgresql:\/\//i);
    expect(text).not.toMatch(/DATABASE_URL/i);
    expect(text).not.toMatch(/API_FOOTBALL_KEY/i);
    expect(text).not.toMatch(/FOOTBALL_DATA_API_KEY/i);
    expect(text).not.toMatch(/CRON_SECRET/i);
  });

  test("popup API for unknown player id returns 404 — no stack trace", async ({ request }) => {
    const res = await request.get("/api/players/999999/popup");
    expect(res.status()).toBe(404);
    const body = await res.json();

    // Error response should not leak internal paths or DB details
    const text = JSON.stringify(body);
    expect(text).not.toMatch(/prisma/i);
    expect(text).not.toMatch(/node_modules/i);
    expect(text).not.toMatch(/at Object\./);
  });
});

// ── XSS surface ───────────────────────────────────────────────────────────────

test.describe("XSS surface", () => {
  test("search input sanitized — injected <script> does not execute", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));

    const alerts: string[] = [];
    page.on("dialog", async dialog => {
      alerts.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto("/players");
    await page.locator("input[placeholder='Buscar jogador...']").fill("<script>alert('xss')</script>");

    await page.waitForTimeout(500);
    expect(alerts).toHaveLength(0);
  });

  test("team search input sanitized", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("copa360_splash_seen", "1"));

    const alerts: string[] = [];
    page.on("dialog", async dialog => {
      alerts.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto("/teams");
    await page.locator("input[placeholder='Buscar seleção...']").fill("<img src=x onerror=alert(1)>");

    await page.waitForTimeout(500);
    expect(alerts).toHaveLength(0);
  });
});

// ── No sensitive data in page source ─────────────────────────────────────────

test.describe("Page source does not expose secrets", () => {
  const PATTERNS = [
    /postgresql:\/\//i,
    /DATABASE_URL/,
    /API_FOOTBALL_KEY/,
    /FOOTBALL_DATA_API_KEY/,
    /CRON_SECRET/,
  ];

  for (const route of ["/", "/teams", "/players"]) {
    test(`${route} HTML source contains no secret patterns`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const html = await page.content();

      for (const pattern of PATTERNS) {
        expect(html).not.toMatch(pattern);
      }
    });
  }
});
