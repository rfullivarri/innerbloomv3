import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { OnboardingLanguage } from '../constants';
import type { GameMode, XP } from '../state';
import { GpProgressBar } from './GpProgressBar';
import { getOnboardingRhythmTheme } from '../utils/onboardingRhythmTheme';

interface HUDProps {
  language?: OnboardingLanguage;
  mode: GameMode | null;
  stepIndex: number;
  totalSteps: number;
  xp: XP;
  highlighted?: boolean;
  onRestart?: () => void;
  onExit?: () => void;
  onBrandClick?: () => void;
}

const MODE_BADGE_LABELS: Record<GameMode, string> = {
  LOW: 'Low Mood',
  CHILL: 'Chill Mood',
  FLOW: 'Flow Mood',
  EVOLVE: 'Evolve Mood',
};

type PillarKey = 'Body' | 'Mind' | 'Soul';

const PILLAR_META: Record<PillarKey, { icon: string }> = {
  Body: { icon: '🫀' },
  Mind: { icon: '🧠' },
  Soul: { icon: '🏵️' },
};

function ModeBadge({ mode }: { mode: GameMode | null }) {
  if (!mode) {
    return null;
  }

  const theme = getOnboardingRhythmTheme(mode);
  const style = {
    '--chip-accent': theme.badgeAccent,
    background: 'linear-gradient(135deg, rgba(91, 79, 140, 0.96), rgba(48, 55, 86, 0.98))',
    color: '#ffffff',
    borderColor: 'rgba(255,255,255,0.28)',
    textShadow: '0 1px 2px rgba(7,10,24,0.35)',
    boxShadow: '0 10px 24px rgba(34, 28, 72, 0.32)',
  } as CSSProperties;

  return (
    <span
      className="onboarding-mode-chip inline-flex items-center rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white ring-1 ring-white/10"
      style={style}
    >
      {MODE_BADGE_LABELS[mode]}
    </span>
  );
}

function MiniPillarBar({ icon, value }: { icon: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 text-[0.65rem] text-white/70">
      <span className="shrink-0 text-base leading-none">{icon}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b]"
          />
        </div>
        <span className="shrink-0 font-semibold text-white/80">{Math.round(value)} GP</span>
      </div>
    </div>
  );
}

export function HUD({ language = 'es', mode, stepIndex, totalSteps, xp, highlighted = false, onRestart, onExit, onBrandClick }: HUDProps) {
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, progress));
  const handleBrand = onBrandClick ?? onExit;

  return (
    <header
      className={`onboarding-premium-shell fixed inset-x-0 top-0 z-40 border-b transition duration-200 ${
        highlighted
          ? 'border-sky-200/40 shadow-[0_14px_38px_rgba(8,57,104,0.35)] ring-1 ring-sky-200/30'
          : 'border-white/15'
      }`}
    >
      <div className="mx-auto w-full max-w-4xl px-3 py-3 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {handleBrand ? (
              <button
                type="button"
                onClick={handleBrand}
                className="inline-flex items-center rounded-full border border-white/15 px-2 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Innerbloom
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2 sm:gap-3">
              {mode ? <ModeBadge mode={mode} /> : null}
              {onRestart ? (
                <button
                  type="button"
                  onClick={onRestart}
                  className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:inline-flex"
                  aria-label={language === 'en' ? 'Restart onboarding' : 'Reiniciar onboarding'}
                >
                  ↺
                </button>
              ) : null}
              {onExit ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label={language === 'en' ? 'Back to landing' : 'Volver a la landing'}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
          <GpProgressBar progress={safeProgress} totalGp={Math.round(xp.total)} />
          <div className="flex items-center gap-2">
            {(Object.keys(PILLAR_META) as PillarKey[]).map((pillar) => (
              <MiniPillarBar key={pillar} icon={PILLAR_META[pillar].icon} value={xp[pillar]} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
