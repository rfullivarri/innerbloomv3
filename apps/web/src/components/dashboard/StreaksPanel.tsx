import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import {
  getTasks,
  getUserDailyXp,
  getUserStreakPanel,
  type DailyXpPoint,
  type StreakPanelRange,
  type StreakPanelResponse,
  type StreakPanelTask,
  type UserTask,
} from '../../lib/api';
import { asArray, dateStr } from '../../lib/safe';
import { InfoDotTarget } from '../InfoDot/InfoDotTarget';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

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

type Mode = GameMode;

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

const RANGE_TABS: Array<{ value: StreakPanelRange; label: string }> = [
  { value: 'week', label: 'Sem' },
  { value: 'month', label: 'Mes' },
  { value: 'qtr', label: '3M' },
];

const PANEL_ENABLED = String(import.meta.env.VITE_SHOW_STREAKS_PANEL ?? 'true').toLowerCase() !== 'false';

interface StreaksPanelProps {
  userId: string;
  gameMode?: string | null;
  weeklyTarget?: number | null;
}

type TaskHistory = {
  values: number[];
  labels?: string[];
};

type DisplayTask = {
  id: string;
  name: string;
  stat?: string;
  weeklyDone: number;
  weeklyGoal: number;
  streakWeeks: number;
  scopeCount: number;
  scopeXp: number;
  history: TaskHistory;
  highlight?: boolean;
};

const numberFormatter = new Intl.NumberFormat('es-AR');

type GlowChipProps = {
  glowPrimary: string;
  glowSecondary: string;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
};

function GlowChip({ glowPrimary, glowSecondary, children, className, innerClassName }: GlowChipProps) {
  const style = {
    '--glow-primary': glowPrimary,
    '--glow-secondary': glowSecondary,
  } as CSSProperties;

  return (
    <span className={cx('glow-chip inline-flex', className)} style={style}>
      <span className={cx('relative z-[1] inline-flex items-center', innerClassName)}>{children}</span>
    </span>
  );
}

const MODE_CHIP_STYLES: Record<Mode, { glowPrimary: string; glowSecondary: string; innerClassName: string }> = {
  Low: {
    glowPrimary: 'rgba(248, 113, 113, 0.65)',
    glowSecondary: 'rgba(239, 68, 68, 0.35)',
    innerClassName:
      'gap-2 rounded-full border border-rose-400/60 bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-50 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
  },
  Chill: {
    glowPrimary: 'rgba(74, 222, 128, 0.6)',
    glowSecondary: 'rgba(34, 197, 94, 0.3)',
    innerClassName:
      'gap-2 rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-[0_0_12px_rgba(34,197,94,0.2)]',
  },
  Flow: {
    glowPrimary: 'rgba(96, 165, 250, 0.6)',
    glowSecondary: 'rgba(59, 130, 246, 0.35)',
    innerClassName:
      'gap-2 rounded-full border border-sky-400/60 bg-sky-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-50 shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  },
  Evolve: {
    glowPrimary: 'rgba(167, 139, 250, 0.65)',
    glowSecondary: 'rgba(139, 92, 246, 0.35)',
    innerClassName:
      'gap-2 rounded-full border border-violet-400/60 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-50 shadow-[0_0_12px_rgba(139,92,246,0.25)]',
  },
};

const TAB_BUTTON_BASE =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 md:text-xs';

function normalizeMode(mode?: string | null): Mode {
  return normalizeGameModeValue(mode) ?? 'Flow';
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

function getRangeMetrics(task: StreakPanelTask | undefined, range: StreakPanelRange) {
  if (!task) {
    return { count: 0, xp: 0, weeks: [] as number[] };
  }

  if (range === 'week') {
    const metrics = task.metrics.week ?? { count: 0, xp: 0 };
    return { count: metrics.count ?? 0, xp: metrics.xp ?? 0, weeks: [] as number[] };
  }

  if (range === 'month') {
    const metrics = task.metrics.month ?? { count: 0, xp: 0, weeks: [] as number[] };
    return { count: metrics.count ?? 0, xp: metrics.xp ?? 0, weeks: metrics.weeks ?? [] };
  }

  const metrics = task.metrics.qtr ?? { count: 0, xp: 0, weeks: [] as number[] };
  return { count: metrics.count ?? 0, xp: metrics.xp ?? 0, weeks: metrics.weeks ?? [] };
}

function buildHistory(task: StreakPanelTask | undefined, range: StreakPanelRange): TaskHistory {
  if (!task || range === 'week') {
    return { values: [] };
  }

  const source = range === 'month' ? task.metrics.month?.weeks ?? [] : task.metrics.qtr?.weeks ?? [];
  const values = source.map((value) => (Number.isFinite(value) ? Number(value) : 0));

  if (values.length === 0) {
    return { values: [] };
  }

  if (range === 'month') {
    const labels = values.map((_, index) => String(index + 1));
    return { values, labels };
  }

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short' });
  const labels = values.map((_, index, array) => {
    const monthsAgo = array.length - 1 - index;
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
    const raw = formatter.format(date);
    return raw.slice(0, 1).toUpperCase();
  });

  return { values, labels };
}

function buildDisplayTask(
  task: StreakPanelTask | undefined,
  fallback: { id: string; name: string; stat?: string; weekDone: number; streakWeeks: number },
  range: StreakPanelRange,
  weeklyGoal: number,
  highlight?: boolean,
): DisplayTask {
  const weeklyDone = task?.metrics.week?.count ?? fallback.weekDone ?? 0;
  const { count: scopeCount, xp: scopeXp } = getRangeMetrics(task, range);
  const history = buildHistory(task, range);

  return {
    id: fallback.id,
    name: fallback.name,
    stat: fallback.stat,
    weeklyDone,
    weeklyGoal,
    streakWeeks: fallback.streakWeeks ?? 0,
    scopeCount,
    scopeXp,
    history,
    highlight,
  } satisfies DisplayTask;
}

function TaskItem({ item }: { item: DisplayTask }) {
  const status = getStatusColor(item.weeklyDone, item.weeklyGoal);
  const pct = computeProgressPercent(item.weeklyDone, item.weeklyGoal);
  const showHistory = item.history.values.length > 0;

  return (
    <article
      className={cx(
        'flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-slate-200 shadow-[0_6px_20px_rgba(15,23,42,0.3)]',
        item.highlight && 'border-violet-400/60 bg-violet-400/10 shadow-[0_8px_26px_rgba(99,102,241,0.3)]',
      )}
      aria-label={`Streak ${item.name}, ${item.weeklyDone} of ${item.weeklyGoal} this week, ${item.streakWeeks} consecutive weeks`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0 space-y-0.5">
          <div className="truncate text-sm font-medium leading-tight text-slate-200 md:text-base" title={item.name}>
            {item.name}
          </div>
          {item.stat && (
            <p className="truncate text-xs text-slate-400" title={item.stat}>
              {item.stat}
            </p>
          )}
        </div>
        {item.streakWeeks > 0 && (
          <GlowChip
            glowPrimary="rgba(251, 191, 36, 0.65)"
            glowSecondary="rgba(249, 115, 22, 0.45)"
            innerClassName="gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
          >
            <span aria-hidden>🔥</span>
            x{numberFormatter.format(item.streakWeeks)}
          </GlowChip>
        )}
      </div>

      <div
        className={cx(
          'flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between',
          showHistory ? 'md:gap-4' : 'md:items-center',
        )}
      >
        <div className="flex flex-col gap-2 md:min-w-[220px] md:flex-1">
          <div className="flex items-center gap-3">
            <span
              className={cx(
                'h-2.5 w-2.5 shrink-0 rounded-full',
                status === 'high' && 'bg-emerald-400',
                status === 'mid' && 'bg-amber-400',
                status === 'low' && 'bg-rose-400',
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-violet-400/20">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-sky-300 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="ml-2 shrink-0 text-xs tabular-nums text-slate-200 md:ml-3">
              {item.weeklyDone}/{item.weeklyGoal}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-100">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5">
              ✓×{numberFormatter.format(item.scopeCount)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-0.5">
              +{numberFormatter.format(item.scopeXp)} XP
            </span>
          </div>
        </div>

        {showHistory && (
          <div className="flex flex-col items-end gap-1 md:min-w-[72px]">
            <div className="flex items-end gap-1">
              {item.history.values.map((value, index) => {
                const ratio = item.weeklyGoal > 0 ? value / item.weeklyGoal : 0;
                const clamped = Math.max(0, Math.min(ratio, 1.6));
                const height = 12 + clamped * 12;
                const isHit = value >= item.weeklyGoal;
                return (
                  <div
                    key={index}
                    className={cx(
                      'w-2 rounded-sm transition-all',
                      isHit ? 'bg-emerald-400/80' : 'bg-slate-500/50',
                    )}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
            {item.history.labels && item.history.labels.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                {item.history.labels.map((label, index) => (
                  <span key={index}>{label}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function StreaksPanel({ userId, gameMode, weeklyTarget }: StreaksPanelProps) {
  const [pillar, setPillar] = useState<Pillar>('Body');
  const [range, setRange] = useState<StreakPanelRange>('month');

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
        range,
        mode: normalizedMode,
      }),
    [userId, pillar, normalizedMode, range],
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
        return buildDisplayTask(
          task,
          {
            id: entry.id,
            name: entry.name,
            stat: entry.stat,
            weekDone: entry.weekDone,
            streakWeeks: entry.streakWeeks,
          },
          range,
          tier,
          true,
        );
      }),
    [range, tier, tasksById, topStreaks],
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
        .map((task) =>
          buildDisplayTask(
            task,
            {
              id: task.id,
              name: task.name,
              stat: task.stat,
              weekDone: task.weekDone,
              streakWeeks: task.streakWeeks,
            },
            range,
            tier,
          ),
        ),
    [range, sortedTasks, tier, topIds],
  );

  const isLoading = status === 'idle' || status === 'loading';
  const isError = status === 'error';
  const hasContent = !isLoading && !isError;

  const modeLabel = `${normalizedMode.toUpperCase()} · ${tier}×/WEEK`;
  const modeChip = MODE_CHIP_STYLES[normalizedMode];

  return (
    <Card
      title="🔥 Streaks"
      bodyClassName="gap-5 p-3 text-slate-100 md:p-4"
      className="text-sm leading-relaxed"
      rightSlot={
        <InfoDotTarget id="streaksGuide" placement="left" className="flex items-center gap-2">
          <GlowChip
            glowPrimary={modeChip.glowPrimary}
            glowSecondary={modeChip.glowSecondary}
            innerClassName={modeChip.innerClassName}
          >
            {modeLabel}
          </GlowChip>
        </InfoDotTarget>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
          {PILLAR_TABS.map((tab) => {
            const isActive = pillar === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setPillar(tab.value)}
                className={cx(
                  TAB_BUTTON_BASE,
                  'leading-none',
                  isActive
                    ? 'border-violet-300/80 bg-violet-500 text-white shadow-[0_4px_16px_rgba(139,92,246,0.45)]'
                    : 'border-white/10 bg-white/10 text-slate-200 hover:border-white/20 hover:bg-white/15',
                )}
                aria-pressed={isActive}
              >
                <span aria-hidden>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {isError && (
          <p className="text-sm text-rose-300">
            No pudimos cargar tus rachas activas
            {error?.message ? `: ${error.message}` : '.'}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`top-skeleton-${index}`} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : (
          hasContent && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="text-base font-semibold leading-tight text-slate-100 md:text-lg">Top streaks</h4>
                <span className="text-xs text-slate-400 md:text-sm">— consecutive weeks completed</span>
              </div>
              {topEntries.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {topEntries.map((entry) => (
                    <TaskItem key={entry.id} item={entry} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Todavía no hay rachas destacadas.</p>
              )}
            </section>
          )
        )}

        <InfoDotTarget
          id="scopesGuide"
          placement="top"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            {RANGE_TABS.map((tab) => {
              const isActive = range === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setRange(tab.value)}
                  className={cx(
                    TAB_BUTTON_BASE,
                    isActive
                      ? 'border-white/60 bg-white text-slate-900 shadow-[0_4px_16px_rgba(226,232,240,0.35)]'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10',
                  )}
                  aria-pressed={isActive}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </InfoDotTarget>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`task-skeleton-${index}`} className="h-24 animate-pulse rounded-xl border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : (
          hasContent && (
            <section className="space-y-3">
              <h4 className="text-base font-semibold leading-tight text-slate-100 md:text-lg">Todas las tareas</h4>
              {displayTasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
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
          )
        )}
      </div>
    </Card>
  );
}
