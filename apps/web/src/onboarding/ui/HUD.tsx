import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { OnboardingLanguage } from '../constants';
import type { GameMode, XP } from '../state';

interface HUDProps {
  language?: OnboardingLanguage;
  mode: GameMode | null;
  stepIndex: number;
  totalSteps: number;
  xp: XP;
  onRestart?: () => void;
  onExit?: () => void;
  onBrandClick?: () => void;
}

const MODE_BADGE_META: Record<GameMode, { label: string; accent: string; dot: string }> = {
  LOW: {
    label: 'Low Mood',
    accent: 'rgba(248, 113, 113, 0.45)',
    dot: 'rgba(248, 113, 113, 0.96)',
  },
  CHILL: {
    label: 'Chill Mood',
    accent: 'rgba(74, 222, 128, 0.4)',
    dot: 'rgba(74, 222, 128, 0.95)',
  },
  FLOW: {
    label: 'Flow Mood',
    accent: 'rgba(56, 189, 248, 0.42)',
    dot: 'rgba(56, 189, 248, 0.95)',
  },
  EVOLVE: {
    label: 'Evolve Mood',
    accent: 'rgba(167, 139, 250, 0.44)',
    dot: 'rgba(167, 139, 250, 0.96)',
  },
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

  const meta = MODE_BADGE_META[mode];
  const style = { '--chip-accent': meta.accent } as CSSProperties;

  return (
    <span
      className="onboarding-mode-chip inline-flex items-center gap-2 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/85 shadow-[0_0_18px_rgba(8,12,24,0.5)] ring-1 ring-white/10"
      style={style}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {meta.label}
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
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"
          />
        </div>
        <span className="shrink-0 font-semibold text-white/80">{Math.round(value)} XP</span>
      </div>
    </div>
  );
}

export function HUD({ language = 'es', mode, stepIndex, totalSteps, xp, onRestart, onExit, onBrandClick }: HUDProps) {
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, progress));
  const handleBrand = onBrandClick ?? onExit;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-white/10 backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-4">
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
          <div className="flex items-center gap-3">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${safeProgress}%` }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 progress-fill--typing"
              />
            </div>
            <div className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/80">
              {Math.round(xp.total)} XP
            </div>
          </div>
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
