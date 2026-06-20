import { expect, test, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('copa360_splash_seen', '1');
  });

  await page.goto('/matches');
});

async function getNextArrow(page: Page) {
  return page.getByRole('button', { name: /Pr[oó]ximas datas|›/i }).first();
}

async function getPreviousArrow(page: Page) {
  return page.getByRole('button', { name: /Datas anteriores|‹/i }).first();
}

async function getDateScroller(page: Page) {
  const nextArrow = await getNextArrow(page);
  const handle = await nextArrow.evaluateHandle((button) => {
    // The scroller is a sibling of the button — check parent's children first
    const parent = button.parentElement;
    if (parent) {
      for (const child of Array.from(parent.children)) {
        const el = child as HTMLElement;
        if (el === button) continue;
        const style = getComputedStyle(el);
        if (/auto|scroll/.test(style.overflowX)) {
          return el;
        }
      }
    }

    // Fallback: traverse ancestors
    let node: HTMLElement | null = button.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX)) {
        return node;
      }
      node = node.parentElement;
    }

    return null;
  });

  const scroller = handle.asElement();
  expect(scroller).not.toBeNull();
  return scroller!;
}

async function expectHiddenOrDisabled(locator: Locator) {
  if (await locator.isVisible()) {
    await expect(locator).toBeDisabled();
    return;
  }

  await expect(locator).toBeHidden();
}

test('AC2 shows the next-dates arrow in the date chip bar', async ({ page }) => {
  const nextArrow = await getNextArrow(page);
  await expect(nextArrow).toBeVisible();
});

test('AC3 hides or disables the previous-dates arrow at scroll start', async ({ page }) => {
  const scroller = await getDateScroller(page);
  const previousArrow = await getPreviousArrow(page);
  const initialScrollLeft = await scroller.evaluate((node) => node.scrollLeft);

  expect(initialScrollLeft).toBe(0);

  await expectHiddenOrDisabled(previousArrow);
});

test('AC4 hides or disables the next-dates arrow at the end of the chip bar', async ({ page }) => {
  const scroller = await getDateScroller(page);
  const nextArrow = await getNextArrow(page);

  await scroller.evaluate((node) => {
    node.scrollLeft = node.scrollWidth;
  });

  await page.waitForTimeout(50);

  await expectHiddenOrDisabled(nextArrow);
});

test('AC5 advances the chip bar by about 200px when clicking next', async ({ page }) => {
  const scroller = await getDateScroller(page);
  const nextArrow = await getNextArrow(page);
  const initialScrollLeft = await scroller.evaluate((node) => node.scrollLeft);

  await nextArrow.click();

  const scrollLeftAfterClick = await scroller.evaluate((node) => node.scrollLeft);

  expect(scrollLeftAfterClick - initialScrollLeft).toBeGreaterThanOrEqual(150);
});

test('AC6 goes back by about 200px when clicking previous after advancing', async ({ page }) => {
  const scroller = await getDateScroller(page);
  const nextArrow = await getNextArrow(page);
  const previousArrow = await getPreviousArrow(page);

  await nextArrow.click();
  const scrollLeftAfterForward = await scroller.evaluate((node) => node.scrollLeft);

  await previousArrow.click();
  const scrollLeftAfterBack = await scroller.evaluate((node) => node.scrollLeft);

  expect(scrollLeftAfterForward - scrollLeftAfterBack).toBeGreaterThanOrEqual(150);
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('AC7 hides the arrow buttons on mobile', async ({ page }) => {
    const nextArrow = await getNextArrow(page);
    const previousArrow = await getPreviousArrow(page);

    await expect(nextArrow).toBeHidden();
    await expect(previousArrow).toBeHidden();
  });
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('AC8 shows the arrow buttons on desktop', async ({ page }) => {
    const nextArrow = await getNextArrow(page);
    const previousArrow = await getPreviousArrow(page);

    await expect(nextArrow).toBeVisible();
    await expect(previousArrow).toBeVisible();
  });
});
