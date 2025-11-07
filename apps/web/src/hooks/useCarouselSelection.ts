import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CarouselSelectionOptions<T extends HTMLElement> = {
  /**
   * Attribute that stores the item index inside the carousel track.
   */
  itemAttribute: string;
  /**
   * Track ref. When omitted, the hook will manage its own ref instance.
   */
  trackRef?: React.RefObject<T>;
  /**
   * Initial index selected for the carousel.
   */
  initialIndex?: number;
};

type CarouselItemMeta = {
  index: number;
  element: HTMLElement;
};

type CarouselSelectionResult<T extends HTMLElement> = {
  activeIndex: number;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  trackRef: React.RefObject<T>;
  handleTrackScroll: () => void;
  refreshActiveIndex: () => number | null;
  getItemFromEventTarget: (target: EventTarget | null) => CarouselItemMeta | null;
};

const SCROLL_IDLE_DELAY_MS = 100;

/**
 * Shared carousel selection logic for Missions carousels.
 */
export function useCarouselSelection<T extends HTMLElement>(
  options: CarouselSelectionOptions<T>,
): CarouselSelectionResult<T> {
  const { itemAttribute, trackRef: providedTrackRef, initialIndex = 0 } = options;

  const fallbackTrackRef = useRef<T | null>(null);
  const trackRef = useMemo(() => providedTrackRef ?? fallbackTrackRef, [providedTrackRef]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollTimeoutRef = useRef<number | null>(null);

  const getItemIndex = useCallback(
    (element: HTMLElement | null): number | null => {
      if (!element) {
        return null;
      }
      const value = element.getAttribute(itemAttribute);
      if (value == null) {
        return null;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    },
    [itemAttribute],
  );

  const getItemFromEventTarget = useCallback(
    (target: EventTarget | null): CarouselItemMeta | null => {
      if (!trackRef.current) {
        return null;
      }
      const element = target instanceof HTMLElement ? target : null;
      if (!element) {
        return null;
      }
      const item = element.closest<HTMLElement>(`[${itemAttribute}]`);
      if (!item || !trackRef.current.contains(item)) {
        return null;
      }
      const index = getItemIndex(item);
      if (index == null) {
        return null;
      }
      return { index, element: item };
    },
    [getItemIndex, itemAttribute, trackRef],
  );

  const findClosestItemIndex = useCallback((): number | null => {
    const track = trackRef.current;
    if (!track) {
      return null;
    }
    const items = track.querySelectorAll<HTMLElement>(`[${itemAttribute}]`);
    if (items.length === 0) {
      return null;
    }
    const { left, width } = track.getBoundingClientRect();
    const center = left + width / 2;
    let closestIndex: number | null = null;
    let minDistance = Number.POSITIVE_INFINITY;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const distance = Math.abs(center - itemCenter);
      if (distance < minDistance - 0.5) {
        const index = getItemIndex(item);
        if (index != null) {
          minDistance = distance;
          closestIndex = index;
        }
      }
    });
    return closestIndex;
  }, [getItemIndex, itemAttribute, trackRef]);

  const refreshActiveIndex = useCallback(() => {
    const nextIndex = findClosestItemIndex();
    if (nextIndex == null) {
      return null;
    }
    setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
    return nextIndex;
  }, [findClosestItemIndex]);

  const handleTrackScroll = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (scrollTimeoutRef.current != null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollTimeoutRef.current = null;
      const nextIndex = findClosestItemIndex();
      if (nextIndex == null) {
        return;
      }
      setActiveIndex((current) => {
        if (current === nextIndex) {
          return current;
        }
        console.debug('[carousel] snapEnd -> activeIndex:', nextIndex);
        return nextIndex;
      });
    }, SCROLL_IDLE_DELAY_MS);
  }, [findClosestItemIndex]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && scrollTimeoutRef.current != null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    trackRef,
    handleTrackScroll,
    refreshActiveIndex,
    getItemFromEventTarget,
  };
}

