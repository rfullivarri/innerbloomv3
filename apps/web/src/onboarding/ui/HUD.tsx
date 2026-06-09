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
    color: theme.badgeAccent,
  } as CSSProperties;

  return (
    <span
      className="onboarding-mode-chip inline-flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em]"
      style={style}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_12px_currentColor]" aria-hidden />
      {MODE_BADGE_LABELS[mode].replace(' Mood', '')}
    </span>
  );
}

function MiniPillarBar({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="onboarding-hud-pillar inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1 py-0.5 text-[0.62rem] text-white/68">
      <span className="shrink-0 text-sm leading-none">{icon}</span>
      <span className="shrink-0 font-semibold text-white/78">{Math.round(value)} GP</span>
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
      <div className="mx-auto w-full max-w-4xl px-5 py-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {handleBrand ? (
              <button
                type="button"
                onClick={handleBrand}
                className="onboarding-hud-brand inline-flex min-w-0 items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white/60 transition hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <img src="/IB-COLOR-LOGO.png" alt="" className="h-5 w-auto shrink-0" />
                <span className="truncate">Innerbloom</span>
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
                  className="inline-flex h-8 w-8 items-center justify-center text-lg font-light text-white/55 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label={language === 'en' ? 'Back to landing' : 'Volver a la landing'}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
          <GpProgressBar progress={safeProgress} totalGp={Math.round(xp.total)} className="onboarding-hud-progress" />
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PILLAR_META) as PillarKey[]).map((pillar) => (
              <MiniPillarBar key={pillar} icon={PILLAR_META[pillar].icon} value={xp[pillar]} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
