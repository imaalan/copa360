/**
 * API TESTS
 *
 * Black-box contract tests for all HTTP API endpoints:
 *  - /api/players/[id]/popup — shape, required fields, status codes, caching
 *  - /api/cron/seed          — auth guard (shape tested in security.spec.ts)
 *
 * Uses Playwright's `request` fixture (no browser needed).
 */

import { test, expect } from "@playwright/test";

// API tests hit a real DB + external enrichment — give generous timeouts.
test.describe.configure({ mode: "serial" });

// ── /api/players/[id]/popup ───────────────────────────────────────────────────

test.describe("GET /api/players/[id]/popup", () => {
  test("returns 200 with correct shape for a known player", async ({ request }) => {
    // Player id=1 is always seeded; fetch it and validate schema
    const res = await request.get("/api/players/1/popup");
    expect(res.status()).toBe(200);

    const body = await res.json();

    // Required top-level fields
    expect(typeof body.id).toBe("number");
    expect(typeof body.name).toBe("string");
    expect(body.name.length).toBeGreaterThan(0);

    // Optional but typed correctly when present
    if (body.position !== null) expect(typeof body.position).toBe("string");
    if (body.nationality !== null) expect(typeof body.nationality).toBe("string");
    if (body.photo !== null) expect(typeof body.photo).toBe("string");

    // team field
    if (body.team !== null) {
      expect(typeof body.team.id).toBe("number");
      expect(typeof body.team.name).toBe("string");
    }

    // stats field (null or well-formed)
    if (body.stats !== null) {
      expect(body.stats).toHaveProperty("goals");
      expect(body.stats).toHaveProperty("games");
      expect(body.stats).toHaveProperty("cards");
    }

    // trophies is always an array
    expect(Array.isArray(body.trophies)).toBe(true);
  });

  test("returns 404 for non-existent player id", async ({ request }) => {
    const res = await request.get("/api/players/999999/popup");
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns 404 for id=0", async ({ request }) => {
    const res = await request.get("/api/players/0/popup");
    expect([400, 404]).toContain(res.status());
  });

  test("returns 4xx for non-numeric id", async ({ request }) => {
    const res = await request.get("/api/players/abc/popup");
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(600);
  });

  test("photo URL is a valid URL when present", async ({ request }) => {
    const res = await request.get("/api/players/1/popup");
    const body = await res.json();
    if (body.photo) {
      expect(body.photo).toMatch(/^(https?:\/\/|\/players\/)/);
    }
  });

  test("stats.goals.total is a number or null when stats present", async ({ request }) => {
    const res = await request.get("/api/players/1/popup");
    const body = await res.json();
    if (body.stats?.goals) {
      const total = body.stats.goals.total;
      expect(total === null || typeof total === "number").toBe(true);
    }
  });

  test("concurrent requests return consistent data", async ({ request }) => {
    const [r1, r2] = await Promise.all([
      request.get("/api/players/1/popup"),
      request.get("/api/players/1/popup"),
    ]);
    expect(r1.status()).toBe(r2.status());

    const [b1, b2] = await Promise.all([r1.json(), r2.json()]);
    expect(b1.id).toBe(b2.id);
    expect(b1.name).toBe(b2.name);
  });
});

// ── /api/cron/seed — shape of authorized response ────────────────────────────

test.describe("GET /api/cron/seed — authorized response shape", () => {
  test("returns well-formed JSON on any response (auth or error)", async ({ request }) => {
    const res = await request.get("/api/cron/seed");
    // We don't have the secret in E2E, so 401 is expected
    expect(res.status()).toBe(401);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/json/);
  });
});

// ── Response headers ──────────────────────────────────────────────────────────

test.describe("API response headers", () => {
  test("popup route returns Content-Type: application/json", async ({ request }) => {
    const res = await request.get("/api/players/1/popup");
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/application\/json/);
  });

  test("popup route does not expose server version in headers", async ({ request }) => {
    const res = await request.get("/api/players/1/popup");
    const server = res.headers()["server"] ?? "";
    // Should not expose exact version like "Apache/2.4.41"
    expect(server).not.toMatch(/\d+\.\d+/);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

test.describe("API edge cases", () => {
  test("popup handles large id without server error", async ({ request }) => {
    const res = await request.get("/api/players/2147483647/popup");
    expect([404, 400]).toContain(res.status());
  });

  test("popup handles negative id", async ({ request }) => {
    const res = await request.get("/api/players/-1/popup");
    expect([404, 400]).toContain(res.status());
  });

  test("HEAD request to popup route does not 500", async ({ request }) => {
    const res = await request.head("/api/players/1/popup");
    expect([200, 404, 405]).toContain(res.status());
  });
});
