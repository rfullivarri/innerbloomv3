import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isStandaloneMode } from '../../lib/pwa';
import { OFFICIAL_LANDING_CSS_VARIABLES } from '../../content/officialDesignTokens';

const MIN_DURATION_MS = Math.round(450 * 1.3);
const MAX_DURATION_MS = Math.round(1200 * 1.3);
const SPLASH_SESSION_KEY = 'innerbloom.pwaSplashShown';

interface StandaloneSplashProps {
  onDone?: () => void;
}

function isReloadNavigation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigationEntry = window.performance
    .getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;

  if (navigationEntry?.type) {
    return navigationEntry.type === 'reload';
  }

  const legacyNavigation = (window.performance as Performance & { navigation?: { type?: number } }).navigation;
  return legacyNavigation?.type === 1;
}

function shouldRenderSplash(standalone: boolean): boolean {
  if (!standalone || typeof window === 'undefined') {
    return false;
  }

  if (isReloadNavigation()) {
    return false;
  }

  try {
    if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
      return false;
    }
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
  } catch {
    // If storage is unavailable, we still show the splash on first load.
  }

  return true;
}

export function StandaloneSplash({ onDone }: StandaloneSplashProps) {
  const prefersReducedMotion = useReducedMotion();
  const standalone = useMemo(() => isStandaloneMode(), []);
  const canShowSplash = useMemo(() => shouldRenderSplash(standalone), [standalone]);
  const [visible, setVisible] = useState(canShowSplash);
  const [mounted, setMounted] = useState(canShowSplash);
  const [readyToHide, setReadyToHide] = useState(false);

  useEffect(() => {
    if (!canShowSplash) {
      return;
    }

    const minTimer = window.setTimeout(() => {
      setReadyToHide(true);
    }, MIN_DURATION_MS);

    return () => {
      window.clearTimeout(minTimer);
    };
  }, [canShowSplash]);

  useEffect(() => {
    if (!canShowSplash || !readyToHide) {
      return;
    }

    if (document.readyState === 'complete') {
      setVisible(false);
      return;
    }

    const onLoad = () => {
      setVisible(false);
    };

    const maxTimer = window.setTimeout(() => {
      setVisible(false);
    }, MAX_DURATION_MS - MIN_DURATION_MS);

    window.addEventListener('load', onLoad, { once: true });

    return () => {
      window.removeEventListener('load', onLoad);
      window.clearTimeout(maxTimer);
    };
  }, [canShowSplash, readyToHide]);

  if (!canShowSplash || !mounted) {
    return null;
  }

  const flowerDuration = prefersReducedMotion ? 0.2 : 0.32;
  const textDuration = prefersReducedMotion ? 0.2 : 0.3;
  const exitDuration = prefersReducedMotion ? 0.14 : 0.2;
  const textDelay = prefersReducedMotion ? 0 : 0.06;

  return (
    <AnimatePresence
      onExitComplete={() => {
        setMounted(false);
        onDone?.();
      }}
    >
      {visible ? (
        <motion.div
          key="standalone-splash"
          aria-hidden="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #000c40 0%, #f8cdda 100%)',
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: exitDuration, ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-4 px-6">
            <motion.span
              className="text-[1.8rem] font-semibold uppercase tracking-[0.35em] text-white sm:text-[2.15rem]"
              style={{ fontFamily: OFFICIAL_LANDING_CSS_VARIABLES['--font-heading'] }}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: textDuration, delay: textDelay, ease: 'easeOut' }}
            >
              INNERBLOOM
            </motion.span>
            <motion.img
              src="/IB-COLOR-LOGO.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: flowerDuration, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default StandaloneSplash;
