import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { BrandWordmark } from '../layout/BrandWordmark';

interface OnboardingCompletionBannerProps {
  visible: boolean;
}

export function OnboardingCompletionBanner({ visible }: OnboardingCompletionBannerProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.985 }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl border border-black/20 bg-gradient-to-r from-[#7c3aed] via-[#d946ef] to-[#f59e0b] px-4 py-4 text-black shadow-[0_24px_60px_rgba(168,85,247,0.35)] sm:px-5"
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 progress-fill--typing opacity-40" aria-hidden />
          <div className="relative flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/15 bg-white/30 shadow-[0_10px_30px_rgba(15,23,42,0.16)]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/70">
                Onboarding completado
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg font-semibold leading-tight text-black sm:text-2xl">
                <span>Bienvenido a tu</span>
                <BrandWordmark
                  textClassName="text-[1em] font-black tracking-[0.12em] text-black"
                  iconClassName="h-[1.15em]"
                />
              </p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
