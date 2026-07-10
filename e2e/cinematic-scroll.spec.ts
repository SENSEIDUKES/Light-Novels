import { test, expect, Page } from '@playwright/test';
import { seedScript } from './seedStory';

/**
 * Browser tests for the cinematic narration-following scroll system.
 *
 * Narration is faked deterministically by dispatching the production
 * `seihouse-narration` events (the exact contract the playback engine emits),
 * so the tests exercise the real state machine, spring controller, and
 * document scroll surface without depending on installed system voices.
 *
 * The app runs in local-only mode with a story seeded into IndexedDB before
 * the bundle loads.
 */


async function openReader(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=Initializing Celestial Matrices...')).toBeHidden({ timeout: 15000 });
  // The seeded story renders in the local library grid.
  const card = page.locator('[aria-label="View story E2E Scroll Chronicle"]');
  await expect(card).toBeVisible({ timeout: 15000 });
  await card.click();
  // Detail screen → enter the reader for chapter 1.
  const startReading = page.locator('button', { hasText: /Start Reading|Continue Reading|Resume Reading/ }).first();
  await expect(startReading).toBeVisible({ timeout: 15000 });
  await startReading.click();
  // The reader may resume on the unmanifested chapter 2 — go back to
  // chapter 1, the one seeded with content. (The chapter select is
  // CSS-hidden on narrow viewports, so use the Previous Chapter control.)
  const firstParagraph = page.locator('[data-paragraph-index="0"]').first();
  await page.waitForTimeout(500); // let the reader settle on its chapter
  if (!(await firstParagraph.isVisible().catch(() => false))) {
    // The '[' shortcut navigates to the previous chapter in the reader.
    await page.keyboard.press('[');
  }
  // The chapter's first paragraph must be rendered with its semantic anchor.
  await expect(firstParagraph).toBeVisible({ timeout: 15000 });
}

const getScrollTop = (page: Page) =>
  page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollTop);

const narrate = (page: Page, detail: Record<string, unknown>) =>
  page.evaluate((d) => {
    window.dispatchEvent(new CustomEvent('seihouse-narration', { detail: d }));
  }, detail);

async function placeParagraphAtFocusLine(page: Page, paragraphIndex: number) {
  await page.locator(`[data-paragraph-index="${paragraphIndex}"]`).first().evaluate((element) => {
    const viewport = window.visualViewport;
    const focusLine = viewport
      ? viewport.offsetTop + viewport.height * 0.33
      : document.documentElement.clientHeight * 0.33;
    const top = (element as HTMLElement).getBoundingClientRect().top;
    window.scrollBy(0, top - focusLine);
  });
}

async function expectParagraphAtFocusLine(page: Page, paragraphIndex: number) {
  const metrics = await page.locator(`[data-paragraph-index="${paragraphIndex}"]`).first().evaluate((element) => {
    const viewport = window.visualViewport;
    const focusLine = viewport
      ? viewport.offsetTop + viewport.height * 0.33
      : document.documentElement.clientHeight * 0.33;
    return {
      top: (element as HTMLElement).getBoundingClientRect().top,
      focusLine,
    };
  });
  expect(Math.abs(metrics.top - metrics.focusLine)).toBeLessThanOrEqual(40);
}

/** Start fake narration on paragraph `blockIndex` with a spoken duration. */
async function startFakeNarration(page: Page, blockIndex = 2, durationMs = 3000) {
  await narrate(page, { status: 'start' });
  await narrate(page, { status: 'block', blockIndex, durationMs });
}

test.describe('Cinematic narration-following scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedScript);
  });

  test('narration begins and document scrolling advances', async ({ page }) => {
    await openReader(page);
    const before = await getScrollTop(page);
    await startFakeNarration(page, 4, 2000);
    await page.waitForTimeout(1500);
    const after = await getScrollTop(page);
    expect(after).toBeGreaterThan(before);
  });

  test('movement is forward-only and bounded', async ({ page }) => {
    await openReader(page);
    await startFakeNarration(page, 4, 1500);
    let last = await getScrollTop(page);
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(250);
      const now = await getScrollTop(page);
      expect(now).toBeGreaterThanOrEqual(last - 1);
      last = now;
    }
    const max = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return el.scrollHeight - el.clientHeight;
    });
    expect(last).toBeLessThanOrEqual(max);
  });

  test('wheel input yields immediately and stays stopped for 4+ seconds', async ({ page }) => {
    await openReader(page);
    await startFakeNarration(page, 4, 3000);
    await page.waitForTimeout(600);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);
    const yielded = await getScrollTop(page);
    // The Resume affordance appears — the state machine is in `yielded`.
    await expect(page.locator('text=Auto-scroll paused')).toBeVisible();
    // No timed auto-resume: still exactly where the user left it after 4.5s.
    await page.waitForTimeout(4500);
    expect(Math.abs((await getScrollTop(page)) - yielded)).toBeLessThanOrEqual(1);
  });

  test('Resume Reading restarts controlled movement', async ({ page }) => {
    await openReader(page);
    await startFakeNarration(page, 6, 8000);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -200); // scroll back up → yield, target stays below
    await expect(page.locator('text=Auto-scroll paused')).toBeVisible();
    const stopped = await getScrollTop(page);
    await page.getByRole('button', { name: 'Resume Reading', exact: true }).click({
      noWaitAfter: true,
    });
    await page.waitForTimeout(1200);
    expect(await getScrollTop(page)).toBeGreaterThan(stopped);
  });

  test('pause stops animation-frame writes', async ({ page }) => {
    await openReader(page);
    await startFakeNarration(page, 6, 5000);
    await page.waitForTimeout(600);
    await narrate(page, { status: 'pause' });
    await page.waitForTimeout(200);
    const paused = await getScrollTop(page);
    await page.waitForTimeout(1000);
    expect(Math.abs((await getScrollTop(page)) - paused)).toBeLessThanOrEqual(1);
  });

  test('Auto Scroll disabled means narration without movement', async ({ page }) => {
    await openReader(page);
    // Alt+I toggles the Auto Scroll immersion preference in the reader.
    await page.keyboard.press('Alt+i');
    const before = await getScrollTop(page);
    await startFakeNarration(page, 6, 2000);
    await page.waitForTimeout(1500);
    expect(Math.abs((await getScrollTop(page)) - before)).toBeLessThanOrEqual(1);
  });

  test('reduced motion never starts continuous movement', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openReader(page);
    const before = await getScrollTop(page);
    await startFakeNarration(page, 6, 2000);
    await page.waitForTimeout(1500);
    expect(Math.abs((await getScrollTop(page)) - before)).toBeLessThanOrEqual(1);
  });

  test('native keyboard scrolling works and yields the controller', async ({ page }) => {
    await openReader(page);
    await startFakeNarration(page, 6, 8000);
    await page.waitForTimeout(400);
    await page.keyboard.press('PageDown');
    await expect(page.locator('text=Auto-scroll paused')).toBeVisible();
    const afterPageDown = await getScrollTop(page);
    await page.keyboard.press('End');
    await page.waitForTimeout(300);
    expect(await getScrollTop(page)).toBeGreaterThan(afterPageDown);
  });

  test('reload restores the same semantic paragraph', async ({ page }) => {
    await openReader(page);
    // Scroll a specific paragraph to the focus line manually.
    await placeParagraphAtFocusLine(page, 15);
    // Wait past the debounced semantic save.
    await page.waitForTimeout(2600);

    await openReader(page);
    await expect(page.locator('[data-paragraph-index="15"]').first()).toBeVisible({ timeout: 15000 });
    // Give the anchored restoration (fonts + corrective pass) a moment.
    await page.waitForTimeout(1000);
    await expectParagraphAtFocusLine(page, 15);
  });

  test('restoration survives a major viewport-width change', async ({ page }) => {
    await openReader(page);
    await placeParagraphAtFocusLine(page, 20);
    await page.waitForTimeout(2600); // debounced semantic save

    await page.setViewportSize({ width: 480, height: 800 });
    await openReader(page);
    await expect(page.locator('[data-paragraph-index="20"]').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await expectParagraphAtFocusLine(page, 20);
  });
});
