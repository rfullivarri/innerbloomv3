import { devices, expect, test, type Locator, type Page } from '@playwright/test';
import { assertCardNotClipped, scrollUntilSnap } from '../utils/carousel';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';
const BASE_URL = String(process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
const MISSIONS_PATH = '/_dev/missions-v2';

const ACTIVE_TRACK_SELECTOR = '#missions-v2-panel-active .missions-active-carousel__track';
const MARKET_TRACK_SELECTOR = '#missions-v2-panel-market .missions-market-carousel__track';

const DEVICE_SET = [
  {
    name: 'iPhone 14 Pro (Safari)',
    use: {
      ...devices['iPhone 14 Pro'],
      browserName: 'webkit' as const,
    },
  },
  {
    name: 'Pixel 7 (Chrome)',
    use: {
      ...devices['Pixel 7'],
      browserName: 'chromium' as const,
    },
  },
];

async function navigateToMissions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as typeof window & { __IB_FEATURE_FLAGS__?: string[] }).__IB_FEATURE_FLAGS__ = ['missionsV2'];
  });

  await page.goto(`${BASE_URL}${MISSIONS_PATH}`);
  await page.waitForLoadState('networkidle');

  await page.waitForSelector(
    `${ACTIVE_TRACK_SELECTOR} [aria-selected='true']`,
    { state: 'visible', timeout: 15_000 },
  );
  await scrollUntilSnap(page, ACTIVE_TRACK_SELECTOR, { timeout: 5_000 });
}

async function dragHorizontally(page: Page, target: Locator, distance: number): Promise<void> {
  const box = await target.boundingBox();
  if (!box) {
    throw new Error('Unable to retrieve bounding box for drag target');
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + distance, startY, { steps: 12 });
  await page.mouse.up();
}

async function getActiveCarouselIndex(page: Page, trackSelector: string): Promise<number | null> {
  return page.evaluate<number | null>(({ selector }) => {
    const track = document.querySelector<HTMLElement>(selector);
    if (!track) {
      return null;
    }

    const activeOption = track.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!activeOption) {
      return null;
    }

    const container = activeOption.closest<HTMLElement>('[data-carousel-index], [data-slot-carousel-index]') ??
      (activeOption.matches('[data-carousel-index], [data-slot-carousel-index]') ? activeOption : null);
    if (!container) {
      return null;
    }

    const attribute = container.hasAttribute('data-carousel-index')
      ? 'data-carousel-index'
      : 'data-slot-carousel-index';
    const raw = container.getAttribute(attribute);
    if (!raw) {
      return null;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, { selector: trackSelector });
}

for (const device of DEVICE_SET) {
  test.describe(device.name, () => {
    test.use(device.use);

    test.beforeEach(async ({ page }) => {
      await navigateToMissions(page);
    });

    test('market: el card centrado no se corta tras swipe', async ({ page }) => {
      await page.getByRole('tab', { name: 'Market de misiones' }).click();
      await page.waitForSelector(MARKET_TRACK_SELECTOR, { state: 'visible' });
      await scrollUntilSnap(page, MARKET_TRACK_SELECTOR, { timeout: 5_000 });

      const initialIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);
      expect(initialIndex).not.toBeNull();

      const activeFront = page.locator(
        `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card__front`,
      );
      await expect(activeFront).toBeVisible();
      await dragHorizontally(page, activeFront, -160);

      await scrollUntilSnap(page, MARKET_TRACK_SELECTOR, { timeout: 5_000 });

      const afterSwipeIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);
      expect(afterSwipeIndex).not.toBeNull();
      expect(afterSwipeIndex).not.toBe(initialIndex);

      const activeCardSelector = `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card`;
      await assertCardNotClipped(page, activeCardSelector);
    });

    test('slots activos: el card centrado no se corta tras swipe', async ({ page }) => {
      await scrollUntilSnap(page, ACTIVE_TRACK_SELECTOR, { timeout: 5_000 });

      const initialIndex = await getActiveCarouselIndex(page, ACTIVE_TRACK_SELECTOR);
      expect(initialIndex).not.toBeNull();

      const activeSlotCard = page.locator(
        `${ACTIVE_TRACK_SELECTOR} [aria-selected='true'] .missions-active-carousel__card`,
      );
      await expect(activeSlotCard).toBeVisible();
      await dragHorizontally(page, activeSlotCard, -160);

      await scrollUntilSnap(page, ACTIVE_TRACK_SELECTOR, { timeout: 5_000 });

      const afterSwipeIndex = await getActiveCarouselIndex(page, ACTIVE_TRACK_SELECTOR);
      expect(afterSwipeIndex).not.toBeNull();
      expect(afterSwipeIndex).not.toBe(initialIndex);

      const activeCardSelector = `${ACTIVE_TRACK_SELECTOR} [aria-selected='true'] .missions-active-carousel__card`;
      await assertCardNotClipped(page, activeCardSelector);
    });

    test('market: el arrastre funciona sobre el frente y dorso de la carta', async ({ page }) => {
      await page.getByRole('tab', { name: 'Market de misiones' }).click();
      await page.waitForSelector(MARKET_TRACK_SELECTOR, { state: 'visible' });
      await scrollUntilSnap(page, MARKET_TRACK_SELECTOR, { timeout: 5_000 });

      const frontTarget = page.locator(
        `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card__front`,
      );
      await expect(frontTarget).toBeVisible();
      const beforeFrontIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);

      await dragHorizontally(page, frontTarget, -170);
      await scrollUntilSnap(page, MARKET_TRACK_SELECTOR, { timeout: 5_000 });

      const afterFrontIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);
      expect(afterFrontIndex).not.toBeNull();
      expect(afterFrontIndex).not.toBe(beforeFrontIndex);

      const activeCard = page.locator(
        `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card`,
      );
      await activeCard.click();
      await page.waitForSelector(
        `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card[data-flipped='true']`,
      );

      const backTarget = page.locator(
        `${MARKET_TRACK_SELECTOR} [aria-selected='true'] .missions-market-card__back`,
      );
      await expect(backTarget).toBeVisible();

      const beforeBackIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);
      await dragHorizontally(page, backTarget, 170);
      await scrollUntilSnap(page, MARKET_TRACK_SELECTOR, { timeout: 5_000 });

      const afterBackIndex = await getActiveCarouselIndex(page, MARKET_TRACK_SELECTOR);
      expect(afterBackIndex).not.toBeNull();
      expect(afterBackIndex).not.toBe(beforeBackIndex);
    });
  });
}
