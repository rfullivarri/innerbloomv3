import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserDailyEnergy, type DailyEnergySnapshot } from '../../lib/api';
import { Card } from '../ui/Card';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';

interface EnergyCardProps {
  userId: string;
  gameMode?: string | null;
}

type PillarKey = 'HP' | 'Mood' | 'Focus';

type NormalizedEnergy = {
  Body: { percent: number; deltaPct: number | null };
  Soul: { percent: number; deltaPct: number | null };
  Mind: { percent: number; deltaPct: number | null };
};

type NormalizedEnergyResult = {
  energy: NormalizedEnergy;
  hasHistory: boolean;
  topGrowth: { pillar: PillarKey; deltaPct: number } | null;
};

const LABEL_BY_PILLAR: Record<keyof NormalizedEnergy, PillarKey> = {
  Body: 'HP',
  Soul: 'Mood',
  Mind: 'Focus',
};

function toPercent(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(Math.max(0, Math.min(numeric, 100)));
}

function normalize(snapshot: DailyEnergySnapshot | null): NormalizedEnergyResult {
  const baseEnergy: NormalizedEnergy = {
    Body: { percent: 0, deltaPct: null },
    Soul: { percent: 0, deltaPct: null },
    Mind: { percent: 0, deltaPct: null },
  };

  if (!snapshot) {
    return { energy: baseEnergy, hasHistory: false, topGrowth: null };
  }

  const hasHistory = Boolean(snapshot.trend?.hasHistory);
  const deltas = {
    Body: hasHistory ? snapshot.trend?.pillars.Body.deltaPct ?? null : null,
    Soul: hasHistory ? snapshot.trend?.pillars.Soul.deltaPct ?? null : null,
    Mind: hasHistory ? snapshot.trend?.pillars.Mind.deltaPct ?? null : null,
  };

  const energy: NormalizedEnergy = {
    Body: { percent: toPercent(snapshot.hp_pct), deltaPct: deltas.Body },
    Soul: { percent: toPercent(snapshot.mood_pct), deltaPct: deltas.Soul },
    Mind: { percent: toPercent(snapshot.focus_pct), deltaPct: deltas.Mind },
  };

  const topGrowth = hasHistory
    ? (['Body', 'Soul', 'Mind'] as const)
        .map((pillar) => ({
          pillar: LABEL_BY_PILLAR[pillar],
          deltaPct: energy[pillar].deltaPct,
        }))
        .filter((entry): entry is { pillar: PillarKey; deltaPct: number } => typeof entry.deltaPct === 'number')
        .sort((a, b) => b.deltaPct - a.deltaPct)[0] ?? null
    : null;

  return { energy, hasHistory, topGrowth };
}

function formatDelta(delta: number | null): string {
  if (delta === null || Number.isNaN(delta)) return '';
  const rounded = Math.round(delta * 10) / 10;
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function EnergyCard({ userId }: EnergyCardProps) {
  const { data, status } = useRequest(() => getUserDailyEnergy(userId), [userId]);
  const normalized = useMemo(() => normalize(data), [data]);
  const hasData = Boolean(data);

  return (
    <Card
      title="💠 Daily Energy"
      subtitle="Promedio últimos 7 días"
      rightSlot={
        <InfoDotTarget id="dailyEnergy" placement="right" className="inline-flex items-center">
          <span className="sr-only">Más información sobre Daily Energy</span>
        </InfoDotTarget>
      }
    >
      {status === 'loading' && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[70px_1fr] items-center gap-3">
              <div className="h-3 w-12 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos cargar tu energía diaria.</p>
      )}

      {status === 'success' && !hasData && (
        <p className="text-sm text-slate-400">
          Todavía no registraste suficiente actividad para calcular tu Daily Energy.
        </p>
      )}

      {status === 'success' && hasData && (
        <div className="space-y-5">
          {normalized.hasHistory ? (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Mayor crecimiento: {normalized.topGrowth?.pillar ?? '—'}{' '}
              {normalized.topGrowth ? `(${formatDelta(normalized.topGrowth.deltaPct)})` : ''}
            </p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Sin datos suficientes para comparar con la semana anterior.
            </p>
          )}
          <EnergyMeter
            label="HP"
            percent={normalized.energy.Body.percent}
            deltaPct={normalized.energy.Body.deltaPct}
            highlight={normalized.topGrowth?.pillar === 'HP'}
            showComparison={normalized.hasHistory}
          />
          <EnergyMeter
            label="Mood"
            percent={normalized.energy.Soul.percent}
            deltaPct={normalized.energy.Soul.deltaPct}
            highlight={normalized.topGrowth?.pillar === 'Mood'}
            showComparison={normalized.hasHistory}
          />
          <EnergyMeter
            label="Focus"
            percent={normalized.energy.Mind.percent}
            deltaPct={normalized.energy.Mind.deltaPct}
            highlight={normalized.topGrowth?.pillar === 'Focus'}
            showComparison={normalized.hasHistory}
          />
        </div>
      )}
    </Card>
  );
}

interface EnergyMeterProps {
  label: PillarKey;
  percent: number;
  deltaPct?: number | null;
  highlight?: boolean;
  showComparison?: boolean;
}

const GRADIENTS: Record<PillarKey, string> = {
  HP: 'bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400',
  Mood: 'bg-gradient-to-r from-rose-200 via-pink-300 to-fuchsia-400',
  Focus: 'bg-gradient-to-r from-indigo-200 via-violet-300 to-purple-400',
};

function EnergyMeter({ label, percent, deltaPct, highlight = false, showComparison = false }: EnergyMeterProps) {
  const clamped = Math.max(0, Math.min(percent, 100));
  const width = clamped <= 4 ? 4 : clamped;
  const hasDelta = showComparison && typeof deltaPct === 'number';
  const deltaLabel = hasDelta ? formatDelta(deltaPct ?? null) : null;

  return (
    <div className="space-y-2 sm:grid sm:grid-cols-[88px_1fr] sm:items-center sm:gap-4 sm:space-y-0">
      <div className="flex items-center justify-between sm:block">
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
            highlight ? 'text-emerald-200' : 'text-slate-300'
          }`}
        >
          {label}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200 backdrop-blur sm:hidden">
          {clamped}%
        </span>
      </div>
      <div className="relative h-5 w-full overflow-hidden rounded-full border border-white/5 bg-slate-900/40 shadow-[inset_0_1px_1px_rgba(15,23,42,0.45)]">
        <div
          className={`${GRADIENTS[label]} h-full rounded-full transition-[width] duration-500 ease-out progress-fill--typing`}
          style={{ width: `${width}%`, minWidth: clamped === 0 ? '1.5rem' : undefined }}
        />
        <div className="absolute inset-y-0 right-1 hidden items-center sm:flex">
          <span className="rounded-full bg-slate-950/90 px-2 py-0.5 text-[11px] font-semibold text-slate-100 shadow-sm">
            {clamped}%
          </span>
        </div>
      </div>
      {deltaLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
          {deltaLabel} vs. semana anterior
        </p>
      ) : showComparison ? (
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sin variación suficiente</p>
      ) : null}
    </div>
  );
}
