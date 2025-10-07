import { useMemo } from 'react';

import { useRequest } from '../../hooks/useRequest';
import { getUserDailyEnergy, type DailyEnergySnapshot } from '../../lib/api';

interface EnergyCardProps {
  userId: string;
}

const ENERGY_METRICS = [
  {
    key: 'hp' as const,
    source: 'hp_pct' as const,
    label: 'HP',
    gradient: 'linear-gradient(90deg,#37B6C9,#69D6E3)',
  },
  {
    key: 'mood' as const,
    source: 'mood_pct' as const,
    label: 'Mood',
    gradient: 'linear-gradient(90deg,#E74C9E,#FF6EC7)',
  },
  {
    key: 'focus' as const,
    source: 'focus_pct' as const,
    label: 'Focus',
    gradient: 'linear-gradient(90deg,#8E66FF,#B17EFF)',
  },
] satisfies Array<{
  key: 'hp' | 'mood' | 'focus';
  source: keyof Pick<DailyEnergySnapshot, 'hp_pct' | 'mood_pct' | 'focus_pct'>;
  label: string;
  gradient: string;
}>;

type NormalizedEnergy = Record<(typeof ENERGY_METRICS)[number]['key'], number>;

function toPercent(value: number | undefined | null): number {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  const numeric = Number(value);
  const bounded = numeric <= 1 ? Math.max(numeric, 0) * 100 : Math.max(0, Math.min(numeric, 100));
  return Math.round(bounded);
}

function normalize(snapshot: DailyEnergySnapshot | null): NormalizedEnergy {
  const initial: NormalizedEnergy = {
    hp: 0,
    mood: 0,
    focus: 0,
  };

  if (!snapshot) {
    return initial;
  }

  return ENERGY_METRICS.reduce<NormalizedEnergy>((acc, metric) => {
    acc[metric.key] = toPercent(snapshot[metric.source]);
    return acc;
  }, { ...initial });
}

export function EnergyCard({ userId }: EnergyCardProps) {
  const { data, status } = useRequest(() => getUserDailyEnergy(userId), [userId]);
  const normalized = useMemo(() => normalize(data), [data]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">💠 Daily Energy</h3>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          i
        </span>
      </header>

      {status === 'loading' && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-4 w-full animate-pulse rounded bg-white/10" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="mt-6 text-sm text-rose-300">No pudimos cargar tu energía diaria.</p>
      )}

      {status === 'success' && (
        <div className="mt-6 space-y-4">
          {ENERGY_METRICS.map(({ key, label, gradient }) => (
            <EnergyMeter key={key} label={label} value={normalized[key]} gradient={gradient} />
          ))}
        </div>
      )}
    </section>
  );
}

interface EnergyMeterProps {
  label: string;
  value: number;
  gradient: string;
}

function EnergyMeter({ label, value, gradient }: EnergyMeterProps) {
  const percent = Math.max(0, Math.min(Math.round(value), 100));

  return (
    <div className="grid grid-cols-[72px_1fr] items-center gap-3 text-white">
      <span className="text-sm font-semibold text-white/90">{label}</span>
      <div
        className="h-[15px] overflow-hidden rounded-full border border-white/10"
        style={{ background: '#2b2f3f' }}
      >
        <div
          className="flex h-full items-center justify-end rounded-full pr-2 text-[11px] font-extrabold text-white drop-shadow"
          style={{
            width: `${percent}%`,
            background: gradient,
            transition: 'width 0.3s ease',
          }}
        >
          <span>{percent}%</span>
        </div>
      </div>
    </div>
  );
}
