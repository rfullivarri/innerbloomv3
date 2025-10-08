import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import {
  getTasks,
  getUserDailyXp,
  getUserStreakPanel,
  type DailyXpPoint,
  type StreakPanelResponse,
  type StreakPanelTask,
  type UserTask,
} from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';

export const FEATURE_STREAKS_PANEL_V1 = false;

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

interface LegacyStreaksPanelProps {
  userId: string;
}

type LegacyNormalizedDailyXpPoint = DailyXpPoint & { day: string };

type LegacyPanelData = {
  tasks: UserTask[];
  xpSeries: LegacyNormalizedDailyXpPoint[];
};

function legacyBuildRange(daysBack: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - daysBack);
  return { from: dateStr(from), to: dateStr(to) };
}

function legacyComputeWeeklyXp(series: LegacyNormalizedDailyXpPoint[]): number {
  const sorted = [...series].sort((a, b) => (a.date > b.date ? -1 : 1));
  const recent = sorted.slice(0, 7);
  return recent.reduce((sum, entry) => sum + (entry.xp_day ?? 0), 0);
}

const LEGACY_PILLAR_FILTERS = [
  { label: 'Body', value: 'Body' },
  { label: 'Mind', value: 'Mind' },
  { label: 'Soul', value: 'Soul' },
] as const;

const LEGACY_SCOPE_FILTERS = [
  { label: 'Semana', value: 'week' },
  { label: 'Mes', value: 'month' },
  { label: '3M', value: 'quarter' },
] as const;

export function LegacyStreaksPanel({ userId }: LegacyStreaksPanelProps) {
  const range = useMemo(() => legacyBuildRange(30), []);
  const { data, status } = useRequest<LegacyPanelData>(async () => {
    const [tasks, xp] = await Promise.all([
      getTasks(userId),
      getUserDailyXp(userId, range),
    ]);

    const normalizedTasks = asArray<UserTask>(tasks, 'tasks');
    const normalizedSeries = asArray<DailyXpPoint>(xp, 'series').map((row) => {
      const rawDate = (row as any)?.day ?? row.date ?? (row as any)?.created_at ?? (row as any)?.timestamp;
      const day = dateStr(rawDate);
      const fallbackDate = day || row.date || '';
      return {
        ...row,
        day,
        date: fallbackDate,
      } satisfies LegacyNormalizedDailyXpPoint;
    });

    return {
      tasks: normalizedTasks,
      xpSeries: normalizedSeries,
    } satisfies LegacyPanelData;
  }, [userId, range.from, range.to]);

  const weeklyXp = useMemo(() => legacyComputeWeeklyXp(data?.xpSeries ?? []), [data?.xpSeries]);

  const [pillarFilter, setPillarFilter] = useState<(typeof LEGACY_PILLAR_FILTERS)[number]['value']>('Body');
  const [scopeFilter, setScopeFilter] = useState<(typeof LEGACY_SCOPE_FILTERS)[number]['value']>('week');

  const filteredTasks = useMemo(() => {
    if (!data?.tasks) return [];
    return data.tasks.filter((task) => {
      if (!pillarFilter) return true;
      return (task.pillar_id ?? '').toString().toLowerCase().includes(pillarFilter.toLowerCase());
    });
  }, [data?.tasks, pillarFilter]);

  return (
    <Card
      title="🔥 Panel de Rachas"
      subtitle="Vista read-only"
      rightSlot={
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 md:inline-flex">
            Beta
          </span>
          <span aria-hidden>⚡</span>
        </span>
      }
    >
      <div className="flex flex-wrap gap-2">
        {LEGACY_PILLAR_FILTERS.map((filter) => {
          const isActive = pillarFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPillarFilter(filter.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                isActive
                  ? 'border-indigo-300/60 bg-indigo-300/15 text-indigo-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {LEGACY_SCOPE_FILTERS.map((filter) => {
          const isActive = scopeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setScopeFilter(filter.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                isActive
                  ? 'border-amber-300/60 bg-amber-300/15 text-amber-100'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {status === 'loading' && <div className="h-56 w-full animate-pulse rounded-2xl bg-white/10" />}

      {status === 'error' && (
        <p className="text-sm text-rose-300">No pudimos cargar tus tareas activas.</p>
      )}

      {status === 'success' && data && (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-400">
            La API actual aún no expone <code className="rounded bg-white/10 px-1 py-px text-[10px]">daily_log_raw</code>. Listamos tus tareas activas y calculamos el XP semanal total como referencia.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">XP total últimos 7 días</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{weeklyXp.toLocaleString('es-AR')} XP</p>
            <p className="mt-1 text-xs text-slate-400">Filtro: {pillarFilter} · Alcance: {scopeFilter === 'week' ? 'Semana' : scopeFilter === 'month' ? 'Mes' : '3 meses'}</p>
          </div>

          <div className="space-y-3">
            {filteredTasks.slice(0, 8).map((task) => (
              <article key={task.task_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{task.task}</p>
                    <p className="text-xs text-slate-400">Pilar: {task.pillar_id ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-100">+{task.xp_base} XP</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">✓×—</span>
                  </div>
                </div>
              </article>
            ))}

            {filteredTasks.length === 0 && (
              <p className="text-sm text-slate-400">Sin tareas activas para mostrar con el filtro seleccionado.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

type Pillar = 'Body' | 'Mind' | 'Soul';

type Mode = 'Low' | 'Chill' | 'Flow' | 'Evolve';

const MODE_TIERS: Record<Mode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

const PILLAR_TABS: Array<{ value: Pillar; label: string; icon: string }> = [
  { value: 'Body', label: 'Body', icon: '🫀' },
  { value: 'Mind', label: 'Mind', icon: '🧠' },
  { value: 'Soul', label: 'Soul', icon: '🏵️' },
];

const PANEL_ENABLED = String(import.meta.env.VITE_SHOW_STREAKS_PANEL ?? 'true').toLowerCase() !== 'false';

interface StreaksPanelProps {
  userId: string;
  gameMode?: string | null;
  weeklyTarget?: number | null;
}

type DisplayTask = {
  id: string;
  name: string;
  stat?: string;
  done: number;
  goal: number;
  streakWeeks: number;
  history: number[];
  highlight?: boolean;
};

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

function computeProgressPercent(done: number, goal: number): number {
  if (goal <= 0) {
    return 0;
  }

  const pct = Math.round((done / goal) * 100);
  if (!Number.isFinite(pct)) {
    return 0;
  }
  return Math.max(0, Math.min(100, pct));
}

function getStatusColor(done: number, goal: number): 'high' | 'mid' | 'low' {
  if (goal <= 0) {
    return 'low';
  }

  if (done >= goal) {
    return 'high';
  }

  if (done / goal >= 0.5) {
    return 'mid';
  }

  return 'low';
}

function getRecentWeeks(task: StreakPanelTask, goal: number): number[] {
  const weeks = task.metrics.month?.weeks ?? [];
  const lastFive = weeks.slice(-5);
  const padding = Math.max(0, 5 - lastFive.length);
  const padded = Array.from({ length: padding }, () => 0);
  return [...padded, ...lastFive];
}

function TaskItem({ item }: { item: DisplayTask }) {
  const status = getStatusColor(item.done, item.goal);
  const pct = computeProgressPercent(item.done, item.goal);

  return (
    <article
      className={cx(
        'flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 shadow-[0_6px_20px_rgba(15,23,42,0.3)]',
        item.highlight && 'border-violet-400/60 bg-violet-400/10 shadow-[0_8px_26px_rgba(99,102,241,0.3)]',
      )}
      aria-label={`Streak ${item.name}, ${item.done} of ${item.goal} this week, ${item.streakWeeks} consecutive weeks`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="text-slate-200 text-sm md:text-base font-medium leading-tight truncate" title={item.name}>
            {item.name}
          </div>
          {item.stat && (
            <p className="text-xs text-slate-400 truncate" title={item.stat}>
              {item.stat}
            </p>
          )}
        </div>
        {item.streakWeeks >= 2 && (
          <span className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
            🔥x{item.streakWeeks}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cx(
            'h-2.5 w-2.5 rounded-full',
            status === 'high' && 'bg-emerald-400',
            status === 'mid' && 'bg-amber-400',
            status === 'low' && 'bg-rose-400',
          )}
        />
        <div className="flex-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-violet-800/40">
            <div className="h-2.5 rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-end gap-1 pl-1">
          {item.history.map((value, index) => {
            const isActive = value >= item.goal;
            return (
              <div
                key={index}
                className={cx(
                  'w-1.5 rounded-sm bg-emerald-500/70 transition-all',
                  isActive ? 'h-4 opacity-100' : 'h-2 opacity-40',
                )}
              />
            );
          })}
        </div>
        <span className="ml-2 text-xs text-slate-300 tabular-nums">
          {item.done}/{item.goal}
        </span>
      </div>
    </article>
  );
}

export function StreaksPanel({ userId, gameMode, weeklyTarget }: StreaksPanelProps) {
  const [pillar, setPillar] = useState<Pillar>('Body');

  const normalizedMode = useMemo(() => normalizeMode(gameMode), [gameMode]);
  const tier = useMemo(() => {
    const defaultTier = MODE_TIERS[normalizedMode];
    if (weeklyTarget && weeklyTarget > 0) {
      return weeklyTarget;
    }
    return defaultTier;
  }, [normalizedMode, weeklyTarget]);

  const { data, status, error } = useRequest<StreakPanelResponse>(
    () =>
      getUserStreakPanel(userId, {
        pillar,
        range: 'month',
        mode: normalizedMode,
      }),
    [userId, pillar, normalizedMode],
    { enabled: PANEL_ENABLED },
  );

  if (!PANEL_ENABLED) {
    return null;
  }

  const tasks = data?.tasks ?? [];
  const topStreaks = data?.topStreaks ?? [];

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);

  const topEntries: DisplayTask[] = useMemo(
    () =>
      topStreaks.map((entry) => {
        const task = tasksById.get(entry.id);
        const history = task ? getRecentWeeks(task, tier) : Array.from({ length: 5 }, () => 0);
        return {
          id: entry.id,
          name: entry.name,
          stat: entry.stat,
          done: entry.weekDone,
          goal: tier,
          streakWeeks: entry.streakWeeks,
          history,
          highlight: true,
        } satisfies DisplayTask;
      }),
    [topStreaks, tasksById, tier],
  );

  const topIds = useMemo(() => new Set(topEntries.map((entry) => entry.id)), [topEntries]);

  const sortedTasks = useMemo(() => {
    const clone = [...tasks];
    clone.sort((a, b) => {
      const xpA = a.metrics.month?.xp ?? 0;
      const xpB = b.metrics.month?.xp ?? 0;
      return xpB - xpA;
    });
    return clone;
  }, [tasks]);

  const displayTasks: DisplayTask[] = useMemo(
    () =>
      sortedTasks
        .filter((task) => !topIds.has(task.id))
        .map((task) => ({
          id: task.id,
          name: task.name,
          stat: task.stat,
          done: task.weekDone,
          goal: tier,
          streakWeeks: task.streakWeeks,
          history: getRecentWeeks(task, tier),
        } satisfies DisplayTask)),
    [sortedTasks, topIds, tier],
  );

  const isLoading = status === 'idle' || status === 'loading';
  const isError = status === 'error';
  const hasContent = !isLoading && !isError;

  const modeLabel = `${normalizedMode.toUpperCase()} · ${tier}×/WEEK`;

  return (
    <Card
      title="🔥 Streaks"
      bodyClassName="gap-5 p-3 text-slate-100 md:p-4"
      className="text-sm leading-relaxed"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
              <span aria-hidden>🎮</span>
              {modeLabel}
            </span>
            <button
              type="button"
              aria-label="Ayuda sobre rachas"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-slate-200 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              i
            </button>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {PILLAR_TABS.map((tab) => {
              const isActive = pillar === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setPillar(tab.value)}
                  className={cx(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300',
                    isActive
                      ? 'bg-violet-500 text-white shadow-[0_4px_16px_rgba(139,92,246,0.4)]'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20',
                  )}
                  aria-pressed={isActive}
                >
                  <span aria-hidden>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {isError && (
          <p className="text-sm text-rose-300">
            No pudimos cargar tus rachas activas
            {error?.message ? `: ${error.message}` : '.'}
          </p>
        )}

        {isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`top-skeleton-${index}`}
                  className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`task-skeleton-${index}`}
                  className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          </div>
        )}

        {hasContent && (
          <div className="space-y-5">
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="text-base font-semibold leading-tight text-slate-100 md:text-lg">
                  Top streaks
                </h4>
                <span className="text-xs text-slate-400 md:text-sm">— consecutive weeks completed</span>
              </div>
              {topEntries.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                  {topEntries.map((entry) => (
                    <TaskItem key={entry.id} item={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Todavía no hay rachas destacadas.</p>
              )}
            </section>

            <section className="space-y-3">
              <h4 className="text-base font-semibold leading-tight text-slate-100 md:text-lg">
                Todas las tareas
              </h4>
              {displayTasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                  {displayTasks.map((task) => (
                    <TaskItem key={task.id} item={task} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No encontramos tareas activas para este pilar en las últimas semanas.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </Card>
  );
}
