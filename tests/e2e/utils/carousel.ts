import { expect, type Page } from '@playwright/test';

type ScrollUntilSnapOptions = {
  /** Maximum time to wait for the track to settle, in milliseconds. */
  timeout?: number;
  /** Number of consecutive stable scroll measurements required before finishing. */
  stableIterations?: number;
  /** Allowed difference (in px) between the card center and the track center. */
  centerTolerance?: number;
};

type ScrollProbeResult = {
  ready: boolean;
  scrollLeft: number;
  isCentered: boolean;
};

const DEFAULT_SCROLL_OPTIONS: Required<ScrollUntilSnapOptions> = {
  timeout: 2_000,
  stableIterations: 4,
  centerTolerance: 2,
};

export async function scrollUntilSnap(
  page: Page,
  trackSelector: string,
  options: ScrollUntilSnapOptions = {},
): Promise<void> {
  const { timeout, stableIterations, centerTolerance } = {
    ...DEFAULT_SCROLL_OPTIONS,
    ...options,
  };

  await page.waitForSelector(trackSelector, { state: 'visible', timeout });

  const startedAt = Date.now();
  let stableCount = 0;
  let lastScrollLeft = Number.NaN;

  while (Date.now() - startedAt < timeout) {
    const { ready, scrollLeft, isCentered } = await page.evaluate<ScrollProbeResult>(
      ({ trackSelector, tolerance }) => {
        const track = document.querySelector<HTMLElement>(trackSelector);
        if (!track) {
          return { ready: false, scrollLeft: 0, isCentered: false };
        }

        const activeOption = track.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!activeOption) {
          return { ready: false, scrollLeft: track.scrollLeft ?? 0, isCentered: false };
        }

        const cardElement =
          activeOption.matches('.missions-active-carousel__card, .missions-market-card')
            ? activeOption
            : activeOption.querySelector<HTMLElement>(
                '.missions-active-carousel__card, .missions-market-card',
              ) ??
              activeOption.closest<HTMLElement>(
                '.missions-active-carousel__card, .missions-market-card',
              ) ??
              activeOption;

        const trackRect = track.getBoundingClientRect();
        const cardRect = cardElement.getBoundingClientRect();
        const trackCenter = trackRect.left + trackRect.width / 2;
        const cardCenter = cardRect.left + cardRect.width / 2;

        const centered = Math.abs(trackCenter - cardCenter) <= tolerance;
        return {
          ready: true,
          scrollLeft: track.scrollLeft ?? 0,
          isCentered: centered,
        };
      },
      { trackSelector, tolerance: centerTolerance },
    );

    if (!ready) {
      stableCount = 0;
      lastScrollLeft = Number.NaN;
      await page.waitForTimeout(50);
      continue;
    }

    if (Number.isNaN(lastScrollLeft)) {
      lastScrollLeft = scrollLeft;
      stableCount = 0;
    } else if (Math.abs(scrollLeft - lastScrollLeft) <= 0.5) {
      stableCount += 1;
    } else {
      stableCount = 0;
      lastScrollLeft = scrollLeft;
    }

    if (stableCount >= stableIterations && isCentered) {
      await page.waitForTimeout(100);
      return;
    }

    await page.waitForTimeout(50);
  }

  throw new Error(`Timed out waiting for carousel '${trackSelector}' to settle`);
}

export async function assertCardNotClipped(
  page: Page,
  cardSelector: string,
  minimumPadding = 8,
): Promise<void> {
  const measurement = await page.evaluate(({ cardSelector }) => {
    const card = document.querySelector<HTMLElement>(cardSelector);
    if (!card) {
      throw new Error(`Card not found for selector: ${cardSelector}`);
    }

    const track = card.closest<HTMLElement>(
      '.missions-market-carousel__track, .missions-active-carousel__track',
    );
    if (!track) {
      throw new Error(`Unable to find carousel track for card: ${cardSelector}`);
    }

    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    return {
      leftPadding: cardRect.left - trackRect.left,
      rightPadding: trackRect.right - cardRect.right,
    };
  }, cardSelector);

  const tolerance = 0.5;
  expect(measurement.leftPadding).toBeGreaterThanOrEqual(minimumPadding - tolerance);
  expect(measurement.rightPadding).toBeGreaterThanOrEqual(minimumPadding - tolerance);
}
