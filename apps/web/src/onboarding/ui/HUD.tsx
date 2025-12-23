import { motion } from 'framer-motion';
import type { GameMode, XP } from '../state';

interface HUDProps {
  mode: GameMode | null;
  stepIndex: number;
  totalSteps: number;
  xp: XP;
  onRestart?: () => void;
  onExit?: () => void;
  onBrandClick?: () => void;
}

const MODE_BADGE_META: Record<GameMode, { label: string; className: string; dotClass: string }> = {
  LOW: {
    label: 'Low Mood',
    className: 'border-amber-300/40 bg-amber-300/15 text-amber-50',
    dotClass: 'bg-amber-200',
  },
  CHILL: {
    label: 'Chill Mood',
    className: 'border-emerald-300/40 bg-emerald-300/15 text-emerald-50',
    dotClass: 'bg-emerald-200',
  },
  FLOW: {
    label: 'Flow Mood',
    className: 'border-sky-400/40 bg-sky-400/15 text-sky-50',
    dotClass: 'bg-sky-200',
  },
  EVOLVE: {
    label: 'Evolve Mood',
    className: 'border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-50',
    dotClass: 'bg-fuchsia-200',
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
    return (
      <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/60">
        Elegí tu Game Mode
      </span>
    );
  }

  const meta = MODE_BADGE_META[mode];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] shadow-[0_0_18px_rgba(15,23,42,0.35)] backdrop-blur ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
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

export function HUD({ mode, stepIndex, totalSteps, xp, onRestart, onExit, onBrandClick }: HUDProps) {
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, progress));
  const handleBrand = onBrandClick ?? onExit;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur">
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
              <ModeBadge mode={mode} />
              {onRestart ? (
                <button
                  type="button"
                  onClick={onRestart}
                  className="hidden h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:inline-flex"
                  aria-label="Reiniciar onboarding"
                >
                  ↺
                </button>
              ) : null}
              {onExit ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                  aria-label="Volver a la landing"
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
