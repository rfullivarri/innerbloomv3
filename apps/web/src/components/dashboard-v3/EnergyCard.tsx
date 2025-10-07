import { useMemo } from 'react';
import { useRequest } from '../../hooks/useRequest';
import { getUserState, type UserState } from '../../lib/api';

interface EnergyCardProps {
  userId: string;
}

function toPercent(value: number | undefined): number {
  if (value == null) return 0;
  if (value <= 1) return Math.round(Math.max(value, 0) * 100);
  return Math.round(Math.max(0, Math.min(value, 100)));
}

function normalize(state: UserState | null) {
  if (!state) {
    return {
      mode: 'Flow',
      Body: { hp: 0, xpToday: 0, target: 0 },
      Mind: { focus: 0, xpToday: 0, target: 0 },
      Soul: { mood: 0, xpToday: 0, target: 0 },
    };
  }

  return {
    mode: state.mode || 'Flow',
    Body: {
      hp: toPercent(state.pillars.Body.hp),
      xpToday: state.pillars.Body.xp_today ?? 0,
      target: state.pillars.Body.xp_obj_day ?? 0,
    },
    Mind: {
      focus: toPercent(state.pillars.Mind.focus),
      xpToday: state.pillars.Mind.xp_today ?? 0,
      target: state.pillars.Mind.xp_obj_day ?? 0,
    },
    Soul: {
      mood: toPercent(state.pillars.Soul.mood),
      xpToday: state.pillars.Soul.xp_today ?? 0,
      target: state.pillars.Soul.xp_obj_day ?? 0,
    },
  };
}

export function EnergyCard({ userId }: EnergyCardProps) {
  const { data, status } = useRequest(() => getUserState(userId), [userId]);
  const normalized = useMemo(() => normalize(data), [data]);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-text backdrop-blur">
      <header className="flex flex-wrap items-center justify-between gap-3 text-white">
        <h3 className="text-lg font-semibold">💠 Daily Energy</h3>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-text-muted">
          Modo: {normalized.mode}
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
        <div className="mt-6 space-y-5">
          <EnergyMeter label="HP" value={normalized.Body.hp} xpToday={normalized.Body.xpToday} target={normalized.Body.target} />
          <EnergyMeter label="Mood" value={normalized.Soul.mood} xpToday={normalized.Soul.xpToday} target={normalized.Soul.target} />
          <EnergyMeter label="Focus" value={normalized.Mind.focus} xpToday={normalized.Mind.xpToday} target={normalized.Mind.target} />
        </div>
      )}
    </section>
  );
}

interface EnergyMeterProps {
  label: string;
  value: number;
  xpToday: number;
  target: number;
}

function EnergyMeter({ label, value, xpToday, target }: EnergyMeterProps) {
  const percent = Math.min(100, Math.max(value, 0));
  const palette: Record<string, string> = {
    HP: 'from-rose-300 via-rose-200 to-rose-100',
    Mood: 'from-emerald-300 via-emerald-200 to-emerald-100',
    Focus: 'from-sky-300 via-sky-200 to-sky-100',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${palette[label] ?? 'from-indigo-300 via-indigo-200 to-indigo-100'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-text-muted">XP hoy: {xpToday.toFixed(1)} · Objetivo diario: {target.toFixed(1)}</p>
    </div>
  );
}
