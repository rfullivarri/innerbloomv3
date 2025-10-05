interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0;

  return (
    <div className="space-y-2">
      {label && <p className="text-xs uppercase tracking-wide text-text-subtle">{label}</p>}
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-purple via-accent-blue to-accent-amber transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <p className="text-right text-xs font-semibold text-text-muted">{safeValue.toFixed(0)}%</p>
    </div>
  );
}
