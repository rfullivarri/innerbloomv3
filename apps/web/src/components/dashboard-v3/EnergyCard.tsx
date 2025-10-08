import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserDailyEnergy, type DailyEnergySnapshot } from '../../lib/api';
import { Card } from '../ui/Card';

interface EnergyCardProps {
  userId: string;
  gameMode?: string | null;
}

type PillarKey = 'HP' | 'Mood' | 'Focus';

type NormalizedEnergy = {
  Body: { percent: number };
  Soul: { percent: number };
  Mind: { percent: number };
};

function toPercent(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(Math.max(0, Math.min(numeric, 100)));
}

function normalize(snapshot: DailyEnergySnapshot | null): NormalizedEnergy {
  if (!snapshot) {
    return {
      Body: { percent: 0 },
      Soul: { percent: 0 },
      Mind: { percent: 0 },
    };
  }

  return {
    Body: { percent: toPercent(snapshot.hp_pct) },
    Soul: { percent: toPercent(snapshot.mood_pct) },
    Mind: { percent: toPercent(snapshot.focus_pct) },
  };
}

export function EnergyCard({ userId, gameMode }: EnergyCardProps) {
  const { data, status } = useRequest(() => getUserDailyEnergy(userId), [userId]);
  const normalized = useMemo(() => normalize(data), [data]);
  const hasData = Boolean(data);

  return (
    <Card
      title="💠 Daily Energy"
      subtitle="Promedio últimos 7 días"
      rightSlot={
        gameMode ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
            Modo: {gameMode}
          </span>
        ) : null
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
          <EnergyMeter label="HP" percent={normalized.Body.percent} />
          <EnergyMeter label="Mood" percent={normalized.Soul.percent} />
          <EnergyMeter label="Focus" percent={normalized.Mind.percent} />
          <p className="text-xs text-slate-400">
            Replicamos la visual del MVP usando el endpoint
            <code className="ml-1 rounded bg-white/10 px-1 py-px text-[10px]">/users/:id/daily-energy</code>.
          </p>
        </div>
      )}
    </Card>
  );
}

interface EnergyMeterProps {
  label: PillarKey;
  percent: number;
}

const GRADIENTS: Record<PillarKey, string> = {
  HP: 'bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400',
  Mood: 'bg-gradient-to-r from-rose-200 via-pink-300 to-fuchsia-400',
  Focus: 'bg-gradient-to-r from-indigo-200 via-violet-300 to-purple-400',
};

function EnergyMeter({ label, percent }: EnergyMeterProps) {
  const clamped = Math.max(0, Math.min(percent, 100));
  const width = clamped <= 4 ? 4 : clamped;

  return (
    <div className="space-y-2 sm:grid sm:grid-cols-[88px_1fr] sm:items-center sm:gap-4 sm:space-y-0">
      <div className="flex items-center justify-between sm:block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200 backdrop-blur sm:hidden">
          {clamped}%
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-white/5 bg-slate-900/40 shadow-[inset_0_1px_1px_rgba(15,23,42,0.45)]">
        <div
          className={`${GRADIENTS[label]} h-full rounded-full transition-[width] duration-300 ease-out`}
          style={{ width: `${width}%`, minWidth: clamped === 0 ? '0.75rem' : undefined }}
        />
        <div className="absolute inset-y-0 right-1 hidden items-center sm:flex">
          <span className="rounded-full bg-slate-950/90 px-2 py-0.5 text-[11px] font-semibold text-slate-100 shadow-sm">
            {clamped}%
          </span>
        </div>
      </div>
    </div>
  );
}
