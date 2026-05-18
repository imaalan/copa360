import { chromium } from "@playwright/test";

// Pre-warm all routes so webpack lazily compiles their chunks before tests run.
// Without this, client-side navigation tests fail with ChunkLoadError because
// the dev server hasn't compiled the target route's JS bundle yet.
export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base = process.env.BASE_URL ?? "http://localhost:3000";

  for (const route of ["/", "/teams", "/players", "/matches", "/stats"]) {
    await page.goto(`${base}${route}`).catch(() => {});
    await page.waitForLoadState("load").catch(() => {});
  }

  await browser.close();
}
