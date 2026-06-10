import type { CSSProperties } from 'react';

type HabitTone = 'fragile' | 'building' | 'strong';

type ScoreRingSize = 'sm' | 'md';

const TONE_STYLES: Record<HabitTone, { color: string; soft: string }> = {
  fragile: { color: 'var(--mp-red)', soft: 'rgba(255,107,107,0.22)' },
  building: { color: 'var(--mp-amber)', soft: 'rgba(245,197,89,0.22)' },
  strong: { color: 'var(--mp-green)', soft: 'rgba(91,220,132,0.18)' },
};

function resolveTone(score: number): HabitTone {
  if (score < 50) return 'fragile';
  if (score < 80) return 'building';
  return 'strong';
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function habitDevelopmentTone(score: number) {
  return TONE_STYLES[resolveTone(score)];
}

export function habitDevelopmentStatusLabel(score: number) {
  const tone = resolveTone(clampScore(score));
  if (tone === 'fragile') return 'Hábito frágil';
  if (tone === 'building') return 'Hábito en construcción';
  return 'Hábito fuerte';
}

export function HabitStatusChip({
  label,
  score,
  compact = false,
}: {
  label: string;
  score: number;
  compact?: boolean;
}) {
  const tone = habitDevelopmentTone(score);

  return (
    <span
      className={`inline-flex max-w-full items-center justify-center rounded-full font-semibold leading-tight ${
        compact ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-base'
      }`}
      style={{ backgroundColor: tone.soft, color: tone.color }}
    >
      {label}
    </span>
  );
}

export function PremiumScoreRing({
  score,
  size = 'md',
  animateKey,
}: {
  score: number;
  size?: ScoreRingSize;
  animateKey?: string | number | boolean | null;
}) {
  const clamped = clampScore(score);
  const tone = habitDevelopmentTone(clamped);
  const sizeClass = size === 'sm'
    ? { outer: 'h-24 w-24', inner: 'h-[74px] w-[74px]', number: 'text-4xl', label: 'text-[10px]' }
    : { outer: 'h-28 w-28', inner: 'h-[86px] w-[86px]', number: 'text-[2.45rem]', label: 'text-xs' };
  const style = {
    '--mp-score-target': `${clamped * 3.6}deg`,
    '--mp-score-color': tone.color,
  } as CSSProperties;

  return (
    <div className="grid place-items-center">
      <style>
        {`
          @property --mp-score-angle {
            syntax: '<angle>';
            inherits: false;
            initial-value: 0deg;
          }
          @keyframes mpScoreRingLoad {
            from { --mp-score-angle: 0deg; }
            to { --mp-score-angle: var(--mp-score-target); }
          }
          .mp-score-ring-load {
            background:
              conic-gradient(var(--mp-score-color) var(--mp-score-angle), var(--mp-track-strong) 0);
            animation: mpScoreRingLoad 820ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }
        `}
      </style>
      <div
        className={`mp-score-ring-load grid place-items-center rounded-full ${sizeClass.outer}`}
        key={String(animateKey ?? clamped)}
        style={style}
      >
        <div className={`grid place-items-center rounded-full bg-[color:var(--mp-bg)] ${sizeClass.inner}`}>
          <div className="text-center">
            <p className={`${sizeClass.number} font-semibold leading-none`} style={{ color: tone.color }}>{clamped}</p>
            <p className={`mt-1 font-semibold tracking-[0.08em] text-[color:var(--mp-text-secondary)] ${sizeClass.label}`}>Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}
