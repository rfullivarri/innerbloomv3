import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { isStandaloneMode } from '../../lib/pwa';
import { OFFICIAL_LANDING_CSS_VARIABLES } from '../../content/officialDesignTokens';

const SPLASH_VISIBILITY_MULTIPLIER = 1.3;
const MIN_DURATION_MS = Math.round(450 * SPLASH_VISIBILITY_MULTIPLIER);
const MAX_DURATION_MS = Math.round(1200 * SPLASH_VISIBILITY_MULTIPLIER);

interface StandaloneSplashProps {
  onDone?: () => void;
}

export function StandaloneSplash({ onDone }: StandaloneSplashProps) {
  const prefersReducedMotion = useReducedMotion();
  const standalone = useMemo(() => isStandaloneMode(), []);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [readyToHide, setReadyToHide] = useState(false);

  useEffect(() => {
    if (!standalone) {
      return;
    }

    const minTimer = window.setTimeout(() => {
      setReadyToHide(true);
    }, MIN_DURATION_MS);

    return () => {
      window.clearTimeout(minTimer);
    };
  }, [standalone]);

  useEffect(() => {
    if (!standalone || !readyToHide) {
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
  }, [readyToHide, standalone]);

  if (!standalone || !mounted) {
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
          <div className="flex items-center gap-3 px-6">
            <motion.img
              src="/IB-COLOR-LOGO.png"
              alt=""
              className="h-12 w-12 sm:h-14 sm:w-14"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: flowerDuration, ease: 'easeOut' }}
            />
            <motion.span
              className="text-2xl font-semibold uppercase tracking-[0.34em] text-white sm:text-3xl"
              style={{ fontFamily: OFFICIAL_LANDING_CSS_VARIABLES['--font-body'] }}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: textDuration, delay: textDelay, ease: 'easeOut' }}
            >
              INNERBLOOM
            </motion.span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default StandaloneSplash;
