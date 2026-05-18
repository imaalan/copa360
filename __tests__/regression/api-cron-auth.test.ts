/**
 * REGRESSION + SECURITY TESTS — /api/cron/seed authorization
 *
 * Verifies that the cron route rejects unauthenticated requests.
 * These tests run in Node environment against the Next.js handler directly.
 */

describe("Cron seed route authorization", () => {
  const CRON_SECRET = "test-secret-abc123";

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
    process.env.FOOTBALL_DATA_API_KEY = "";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://localhost/test";
  });

  it("returns 401 when Authorization header is missing", async () => {
    const { GET } = await import("@/app/api/cron/seed/route");
    const req = new Request("http://localhost/api/cron/seed");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when Authorization header has wrong secret", async () => {
    const { GET } = await import("@/app/api/cron/seed/route");
    const req = new Request("http://localhost/api/cron/seed", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header uses wrong scheme", async () => {
    const { GET } = await import("@/app/api/cron/seed/route");
    const req = new Request("http://localhost/api/cron/seed", {
      headers: { authorization: CRON_SECRET }, // missing "Bearer " prefix
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
