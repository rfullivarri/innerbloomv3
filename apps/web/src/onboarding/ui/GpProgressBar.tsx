interface GpProgressBarProps {
  progress: number;
  totalGp: number;
  className?: string;
}

export function GpProgressBar({ progress, totalGp, className }: GpProgressBarProps) {
  const safeProgress = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  const safeTotalGp = Number.isFinite(totalGp) ? Math.max(0, Math.round(totalGp)) : 0;

  return (
    <div className={className ? `flex items-center gap-3 ${className}` : 'flex items-center gap-3'}>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-500 progress-fill--typing"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <div className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/80">
        {safeTotalGp} GP
      </div>
    </div>
  );
}
