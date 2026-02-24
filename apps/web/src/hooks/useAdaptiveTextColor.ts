import { useEffect, useMemo, useState, type CSSProperties, type RefObject } from 'react';

type AdaptiveTextColorOptions = {
  startHex: string;
  endHex: string;
  threshold?: number;
};

type RgbColor = { r: number; g: number; b: number };

const DEFAULT_THRESHOLD = 0.46;
const LIGHT_TEXT = 'rgba(255,255,255,0.92)';
const DARK_TEXT = 'rgba(10,10,20,0.92)';

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.trim().replace('#', '');

  if (normalized.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }

  const intValue = Number.parseInt(normalized, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

function interpolateRgb(start: RgbColor, end: RgbColor, t: number): RgbColor {
  const progress = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(start.r + (end.r - start.r) * progress),
    g: Math.round(start.g + (end.g - start.g) * progress),
    b: Math.round(start.b + (end.b - start.b) * progress)
  };
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance({ r, g, b }: RgbColor): number {
  const linearR = srgbToLinear(r);
  const linearG = srgbToLinear(g);
  const linearB = srgbToLinear(b);
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

export function useAdaptiveTextColor<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { startHex, endHex, threshold = DEFAULT_THRESHOLD }: AdaptiveTextColorOptions
): CSSProperties {
  const [textColor, setTextColor] = useState(LIGHT_TEXT);

  const startColor = useMemo(() => hexToRgb(startHex), [startHex]);
  const endColor = useMemo(() => hexToRgb(endHex), [endHex]);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === 'undefined') {
      return;
    }

    let frameId = 0;
    let isActive = false;

    const updateColor = () => {
      frameId = 0;

      if (!isActive || !ref.current) {
        return;
      }

      const rect = ref.current.getBoundingClientRect();
      const scrollTop = window.scrollY || window.pageYOffset;
      const elementCenterY = rect.top + scrollTop + rect.height / 2;
      const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const ratio = docHeight > 0 ? elementCenterY / docHeight : 0;

      const blendedBackground = interpolateRgb(startColor, endColor, ratio);
      const luminance = getRelativeLuminance(blendedBackground);
      const nextColor = luminance > threshold ? DARK_TEXT : LIGHT_TEXT;

      setTextColor((previous) => (previous === nextColor ? previous : nextColor));
    };

    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateColor);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isActive = entry.isIntersecting;
        if (isActive) {
          requestUpdate();
        }
      },
      { threshold: 0, rootMargin: '25% 0px 25% 0px' }
    );

    observer.observe(element);
    requestUpdate();

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [endColor, ref, startColor, threshold]);

  return {
    color: textColor,
    transition: 'color 250ms ease'
  };
}

