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
  HP: 'from-cyan-300 via-cyan-200 to-sky-200',
  Mood: 'from-rose-300 via-pink-200 to-fuchsia-200',
  Focus: 'from-indigo-300 via-indigo-200 to-purple-200',
};

function EnergyMeter({ label, percent }: EnergyMeterProps) {
  const clamped = Math.max(0, Math.min(percent, 100));
  const width = clamped <= 4 ? 4 : clamped;

  return (
    <div className="grid grid-cols-[70px_1fr] items-center gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</span>
      <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
        <div
          className={`flex h-full items-center justify-end rounded-full bg-gradient-to-r px-2 text-[11px] font-semibold text-white shadow-[inset_0_0_8px_rgba(15,23,42,0.35)] transition-[width] duration-300 ${GRADIENTS[label]}`}
          style={{ width: `${width}%`, minWidth: clamped === 0 ? '2.75rem' : undefined }}
        >
          <span className="drop-shadow-sm">{clamped}%</span>
        </div>
      </div>
    </div>
  );
}
