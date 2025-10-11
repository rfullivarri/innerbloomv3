import { motion } from 'framer-motion';
import { MODE_LABELS } from '../constants';
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

function MiniPillarBar({ icon, value }: { icon: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="flex items-center gap-2 text-[0.7rem] text-white/70">
      <span>{icon}</span>
      <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400"
        />
      </div>
    </div>
  );
}

export function HUD({ mode, stepIndex, totalSteps, xp, onRestart, onExit, onBrandClick }: HUDProps) {
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, progress));
  const currentModeLabel = mode ? MODE_LABELS[mode] : 'Elegí tu Game Mode';
  const handleBrand = onBrandClick ?? onExit;

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-3 py-3 sm:px-4">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            {handleBrand ? (
              <button
                type="button"
                onClick={handleBrand}
                className="inline-flex items-center rounded-full border border-white/15 px-2 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/60 transition hover:border-white/30 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                Innerbloom
              </button>
            ) : null}
            <MiniPillarBar icon="🫀" value={xp.Body} />
            <MiniPillarBar icon="🧠" value={xp.Mind} />
            <MiniPillarBar icon="🏵️" value={xp.Soul} />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.35em] text-white/70">
              {currentModeLabel}
            </span>
            {onRestart ? (
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                ↺
              </button>
            ) : null}
            {onExit ? (
              <button
                type="button"
                onClick={onExit}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
                aria-label="Volver a la landing"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
