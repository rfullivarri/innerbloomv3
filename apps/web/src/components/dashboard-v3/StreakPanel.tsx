
export { StreaksPanel as StreakPanel } from '../dashboard/StreaksPanel';
import { useEffect, useMemo, useState } from 'react';
import { useRequest } from '../../hooks/useRequest';
import {
  getUserStreakPanel,
  type StreakPanelResponse,
  type StreakPanelTask,
} from '../../lib/api';

interface StreakPanelProps {
  userId: string;
  gameMode?: string | null;
  weeklyTarget?: number | null;
}

type Pillar = 'Body' | 'Mind' | 'Soul';
type Range = 'week' | 'month' | 'qtr';
type Mode = 'Low' | 'Chill' | 'Flow' | 'Evolve';

type RangeMetrics = StreakPanelTask['metrics']['week'] | StreakPanelTask['metrics']['month'] | StreakPanelTask['metrics']['qtr'];

const MODE_TIERS: Record<Mode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

const PILLAR_OPTIONS: Array<{ value: Pillar; label: string; icon: string }> = [
  { value: 'Body', label: 'Body', icon: '🫀' },
  { value: 'Mind', label: 'Mind', icon: '🧠' },
  { value: 'Soul', label: 'Soul', icon: '🏵️' },
];

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: 'week', label: 'Sem' },
  { value: 'month', label: 'Mes' },
  { value: 'qtr', label: '3M' },
];

const PANEL_ENABLED = String(import.meta.env.VITE_SHOW_STREAKS_PANEL ?? 'true').toLowerCase() !== 'false';

const numberFormatter = new Intl.NumberFormat('es-AR');

function normalizeMode(mode?: string | null): Mode {
  if (!mode) {
    return 'Flow';
  }

  const normalized = mode.trim().toLowerCase();

  switch (normalized) {
    case 'low':
      return 'Low';
    case 'chill':
      return 'Chill';
    case 'evolve':
    case 'evol':
      return 'Evolve';
    case 'flow':
    case 'flow mood':
    case 'flow_mood':
    default:
      return 'Flow';
  }
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeProgressPercent(done: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  return clamp(Math.round((done / goal) * 100), 0, 100);
}

function getStateColor(done: number, goal: number): 'ok' | 'warn' | 'bad' {
  if (goal <= 0) {
    return 'bad';
  }

  if (done >= goal) {
    return 'ok';
  }

  if (done / goal >= 0.5) {
    return 'warn';
  }

  return 'bad';
}

function computeBarHeight(value: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  const base = 20;
  const extra = 6;

  if (value < goal) {
    const ratio = Math.max(0, value / goal);
    return Math.max(6, Math.round(base * ratio));
  }

  if (value === goal) {
    return base;
  }

  return base + (value - goal) * extra;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      window.clearTimeout(handle);
    };
  }, [value, delay]);

  return debounced;
}

function getRangeMetrics(task: StreakPanelTask, range: Range): RangeMetrics {
  switch (range) {
    case 'week':
      return task.metrics.week;
    case 'month':
      return task.metrics.month;
    case 'qtr':
    default:
      return task.metrics.qtr;
  }
}

function formatXp(value: number): string {
  return `${numberFormatter.format(Math.round(value || 0))} XP`;
}

function getQuarterLabels(): string[] {
  const now = new Date();
  return [-2, -1, 0].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const short = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date);
    return short.charAt(0).toUpperCase();
  });
}

export function StreakPanel({ userId, gameMode, weeklyTarget }: StreakPanelProps) {
  const [pillar, setPillar] = useState<Pillar>('Body');
  const [range, setRange] = useState<Range>('month');
  const [query, setQuery] = useState('');

  const normalizedMode = useMemo(() => normalizeMode(gameMode), [gameMode]);
  const tier = useMemo(() => {
    const defaultTier = MODE_TIERS[normalizedMode];
    if (weeklyTarget && weeklyTarget > 0) {
      return weeklyTarget;
    }
    return defaultTier;
  }, [normalizedMode, weeklyTarget]);

  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const { data, status, error } = useRequest<StreakPanelResponse>(
    () =>
      getUserStreakPanel(userId, {
        pillar,
        range,
        mode: normalizedMode,
        query: debouncedQuery || undefined,
      }),
    [userId, pillar, range, normalizedMode, debouncedQuery],
    { enabled: PANEL_ENABLED },
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if ((window as any).__DBG && status === 'success' && data) {
      console.info('[RACHAS] fetch', { pillar, range, mode: normalizedMode, query: debouncedQuery || undefined }, data);
    }
  }, [data, status, pillar, range, normalizedMode, debouncedQuery]);

  const tasks = data?.tasks ?? [];
  const topStreaks = data?.topStreaks ?? [];

  const monthLabels = useMemo(() => {
    const weeks = tasks[0]?.metrics.month.weeks.length ?? 0;
    return Array.from({ length: weeks }, (_, index) => String(index + 1));
  }, [tasks]);

  const quarterLabels = useMemo(() => getQuarterLabels(), []);

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const sortedTasks = useMemo(() => {
    const clone = [...tasks];
    clone.sort((a, b) => {
      const metricsA = getRangeMetrics(a, range);
      const metricsB = getRangeMetrics(b, range);
      return metricsB.xp - metricsA.xp;
    });
    return clone;
  }, [tasks, range]);

  const modeLabel = `${normalizedMode} · ${tier}×/sem`;

  if (!PANEL_ENABLED) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/5 p-5 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="pointer-events-none absolute inset-x-[-8%] top-[-30%] h-64 bg-[radial-gradient(140px_140px_at_22%_68%,rgba(168,120,255,0.18),transparent_60%),radial-gradient(190px_190px_at_78%_30%,rgba(55,170,255,0.18),transparent_60%)] blur-lg" />
      <div className="relative space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center justify-end gap-2">
            <span
              className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide',
                normalizedMode === 'Low' && 'border-indigo-300/30 bg-indigo-500/20 text-indigo-100',
                normalizedMode === 'Chill' && 'border-sky-300/40 bg-sky-400/20 text-sky-100',
                normalizedMode === 'Flow' && 'border-indigo-300/40 bg-indigo-400/20 text-indigo-50',
                normalizedMode === 'Evolve' && 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100',
              )}
            >
              <span aria-hidden>🎮</span> {modeLabel}
            </span>
            <InfoChip title="Tip sobre game mode" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {PILLAR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition',
                pillar === option.value
                  ? 'border-white/0 bg-white text-slate-900'
                  : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-100 hover:border-indigo-300/60 hover:bg-indigo-500/20',
              )}
              aria-pressed={pillar === option.value}
              onClick={() => setPillar(option.value)}
            >
              <span aria-hidden>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {topStreaks.length > 0 && (
          <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <span aria-hidden>🔥</span>
              Top 3 rachas <span className="text-xs font-normal text-indigo-200/80">— semanas consecutivas completadas</span>
            </div>
            <div className="mt-4 space-y-3">
              {topStreaks.map((entry) => {
                const task = tasksById.get(entry.id);
                const miniWeeks = task?.metrics.month.weeks ?? [];
                const progress = computeProgressPercent(entry.weekDone, tier);
                return (
                  <div key={entry.id} className="relative overflow-hidden rounded-xl border border-indigo-500/30 bg-slate-950/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{entry.name}</p>
                        <p className="truncate text-xs text-indigo-200/80">{entry.stat}</p>
                      </div>
                      <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-200">
                        🔥 x{entry.streakWeeks}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-indigo-900/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-indigo-100">{entry.weekDone}/{tier}</span>
                    </div>
                    {miniWeeks.length > 0 && (
                      <div className="mt-3 flex items-end gap-1">
                        {miniWeeks.map((value, index) => {
                          const state = getStateColor(value, tier);
                          return (
                            <div
                              key={index}
                              className={classNames(
                                'h-2 w-2 rounded-full',
                                state === 'ok' && 'bg-emerald-400',
                                state === 'warn' && 'bg-amber-300',
                                state === 'bad' && 'bg-slate-600',
                              )}
                              title={`Semana ${index + 1}: ${value}/${tier}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={classNames(
                  'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
                  range === option.value
                    ? 'border-white/0 bg-white text-slate-900'
                    : 'border-indigo-400/40 bg-indigo-500/10 text-indigo-100 hover:border-indigo-300/60 hover:bg-indigo-500/20',
                )}
                aria-pressed={range === option.value}
                onClick={() => setRange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <InfoChip title="Mes = semanas · 3M = meses" />
        </div>

        <div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar tareas… (ej.: ayuno)"
            className="w-full rounded-xl border border-indigo-500/40 bg-slate-950/60 px-4 py-2 text-sm font-semibold text-white placeholder:text-indigo-200/60 focus:border-indigo-300 focus:outline-none"
          />
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl border border-indigo-500/20 bg-slate-900/40" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            No pudimos cargar tus rachas. {error?.message}
          </div>
        )}

        {status === 'success' && sortedTasks.length === 0 && (
          <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-4 text-sm text-indigo-100">
            No hay tareas activas para este pilar. Ajustá el filtro para ver más resultados.
          </div>
        )}

        {status === 'success' && sortedTasks.length > 0 && (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const metrics = getRangeMetrics(task, range);
              const weekState = getStateColor(task.metrics.week.count, tier);
              const progress = computeProgressPercent(task.metrics.week.count, tier);
              const showMonthBars = range === 'month' && task.metrics.month.weeks.length > 0;
              const showQuarterBars = range === 'qtr' && task.metrics.qtr.weeks.length > 0;

              return (
                <article
                  key={task.id}
                  className="grid gap-4 rounded-2xl border border-indigo-500/30 bg-slate-950/60 p-4 text-sm sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{task.name}</p>
                        <p className="truncate text-xs text-indigo-200/80">{task.stat}</p>
                      </div>
                      {task.streakWeeks >= 2 && (
                        <span className="rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-xs font-semibold text-orange-200">
                          🔥 x{task.streakWeeks}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={classNames(
                          'h-2 w-2 rounded-full border border-black/40',
                          weekState === 'ok' && 'bg-emerald-400',
                          weekState === 'warn' && 'bg-amber-300',
                          weekState === 'bad' && 'bg-rose-400',
                        )}
                      />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-indigo-900/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-indigo-100">
                        {task.metrics.week.count}/{tier}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-100">
                        ✓×{numberFormatter.format(Math.round(metrics.count || 0))}
                      </span>
                      <span className="rounded-full border border-purple-300/40 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-100">
                        +{formatXp(metrics.xp)}
                      </span>
                    </div>

                    {showMonthBars && (
                      <BarStack values={task.metrics.month.weeks} goal={tier} labels={monthLabels} />
                    )}

                    {showQuarterBars && (
                      <BarStack values={task.metrics.qtr.weeks} goal={tier} labels={quarterLabels} />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-xs text-indigo-200/70">
          Tip: ✓×N = veces en el período · +XP = XP acumulado · 🔥 = racha (semanas). La barra morada refleja tu progreso semanal.
          En Mes se muestran semanas; en 3M se agregan los últimos tres meses.
        </p>
      </div>
    </section>
  );
}

function InfoChip({ title }: { title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-indigo-500/40 bg-slate-950/70 text-xs font-bold text-indigo-100"
    >
      i
    </button>
  );
}

interface BarStackProps {
  values: number[];
  goal: number;
  labels: string[];
}

function BarStack({ values, goal, labels }: BarStackProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex h-16 items-end gap-1">
        {values.map((value, index) => {
          const height = computeBarHeight(value, goal);
          const state = getStateColor(value, goal);
          const label = labels[index] ?? String(index + 1);
          return (
            <div
              key={index}
              className={classNames(
                'w-3 rounded-sm',
                state === 'ok' && 'bg-emerald-400',
                state === 'warn' && 'bg-amber-300',
                state === 'bad' && 'bg-slate-600',
              )}
              style={{ height: `${height}px` }}
              title={`${label}: ${numberFormatter.format(Math.round(value || 0))}/${goal}`}
            />
          );
        })}
      </div>
      {values.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-indigo-200/70">
          {values.map((_, index) => {
            const label = labels[index] ?? String(index + 1);
            return <span key={index}>{label}</span>;
          })}
        </div>
      )}
    </div>
  );
}
