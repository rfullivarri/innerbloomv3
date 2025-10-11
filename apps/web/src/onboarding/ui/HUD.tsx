import { motion } from 'framer-motion';
import { MODE_LABELS } from '../constants';
import type { GameMode, XP } from '../state';

interface HUDProps {
  mode: GameMode | null;
  stepIndex: number;
  totalSteps: number;
  xp: XP;
}

function PillarBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="font-semibold text-white/80">{Math.round(value)} XP</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
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

export function HUD({ mode, stepIndex, totalSteps, xp }: HUDProps) {
  const progress = totalSteps > 1 ? Math.round((stepIndex / (totalSteps - 1)) * 100) : 0;
  const safeProgress = Math.min(100, Math.max(0, progress));
  const currentModeLabel = mode ? MODE_LABELS[mode] : 'Elegí tu Game Mode';

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/50">Gamified Journey</p>
            <h1 className="text-lg font-semibold text-white md:text-xl">{currentModeLabel}</h1>
          </div>
          <div className="text-right text-sm text-white/70">
            <p className="font-semibold text-white">{Math.round(xp.total)} XP</p>
            <p>Total acumulado</p>
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeProgress}%` }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 progress-fill--typing"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <PillarBar label="🫀 Body" value={xp.Body} />
          <PillarBar label="🧠 Mind" value={xp.Mind} />
          <PillarBar label="🏵️ Soul" value={xp.Soul} />
        </div>
      </div>
    </header>
  );
}
