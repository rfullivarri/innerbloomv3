import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StreakPanelRange, StreakPanelTask } from '../../lib/api';
import { getTaskInsights, type TaskInsightsResponse } from '../../lib/api';
import { computeWeeklyHabitHealth, getHabitHealth } from '../../lib/habitHealth';

export { getHabitHealth } from '../../lib/habitHealth';
import { useRequest } from '../../hooks/useRequest';
import type { GameMode } from '../../lib/gameMode';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type TaskSummary = Pick<StreakPanelTask, 'id' | 'name' | 'stat'> & {
  highlight?: boolean;
  monthCount?: number;
  monthXp?: number;
};

const numberFormatter = new Intl.NumberFormat('es-AR');

type TaskInsightsModalProps = {
  taskId: string | null;
  weeklyGoal: number;
  mode: GameMode;
  range: StreakPanelRange;
  onClose: () => void;
  fallbackTask?: TaskSummary | null;
  referenceDate?: Date;
};

type HabitHealthLevel = 'strong' | 'medium' | 'weak';
type ActivityScope = 'week' | 'month' | 'quarter';

function DifficultyInsight({
  difficultyLabel,
  habitHealthLevel,
}: {
  difficultyLabel: string;
  habitHealthLevel: HabitHealthLevel;
}) {
  const normalized = difficultyLabel.toLowerCase();
  const isHard = normalized.includes('difícil') || normalized.includes('dificil') || normalized.includes('hard');
  const isEasy = normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy');

  if (isHard && habitHealthLevel === 'strong') {
    return <p className="text-xs text-slate-200">Se comporta como un hábito estable. Podría considerarse menos difícil.</p>;
  }

  if (isEasy && habitHealthLevel === 'weak') {
    return <p className="text-xs text-slate-200">Está marcada como fácil, pero te cuesta sostenerla.</p>;
  }

  return null;
}

function useEscToClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onClose]);
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  const day = Number.parseInt(value.slice(-2), 10);
  return Number.isFinite(day) ? String(day) : value;
}

function formatWeekdayLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', { weekday: 'narrow' }).format(date).toUpperCase();
}

function parseIsoDate(date: string): Date {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function WeeklyCompletionDonut({
  timeline,
  weeklyGoal,
  currentStreak,
  bestStreak,
  completionRate,
  difficultyLabel,
  weeksSample,
  referenceDate,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  weeklyGoal: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  difficultyLabel?: string | null;
  weeksSample?: number | null;
  referenceDate?: Date;
}) {
  const today = useMemo(() => referenceDate ?? new Date(), [referenceDate]);
  const parsedWeeksSample = Number(weeksSample);
  const { completionPercent, completedWeeks, totalWeeks, habitHealth } = computeWeeklyHabitHealth({
    timeline,
    completionRate,
    weeksSample: parsedWeeksSample,
    referenceDate: today,
  });

  const healthStyles: Record<HabitHealthLevel, string> = {
    strong: 'bg-emerald-300 text-emerald-950',
    medium: 'bg-amber-300 text-amber-950',
    weak: 'bg-rose-300 text-rose-950',
  };

  if (!timeline.length) {
    return <p className="text-sm text-slate-400">Aún no registramos semanas para esta tarea.</p>;
  }

  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, completionPercent));
  const offset = circumference * (1 - progress / 100);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg
        className="h-36 w-36 drop-shadow-[0_0_25px_rgba(52,211,153,0.2)]"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Progreso semanal: ${progress}%`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-white/10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
      className="fill-none stroke-emerald-300 transition-[stroke-dashoffset] duration-500 ease-out"
      strokeLinecap="round"
      transform="rotate(-90 60 60)"
    />
    <text
          x="60"
          y="60"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-50 text-[20px] font-semibold"
        >
          {progress}%
        </text>
      </svg>

      <div className="flex-1 space-y-2 text-center text-xs text-slate-300 sm:text-left">
        <div className="space-y-1">
          <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', healthStyles[habitHealth.level])}>
            {habitHealth.label}
          </span>
          <p className="text-xs text-slate-200">Meta cumplida {completedWeeks} de {totalWeeks} semanas.</p>
        </div>

        <div className="space-y-0.5 text-slate-100">
          {currentStreak === bestStreak && bestStreak > 0 && (
            <p className="text-xs text-emerald-100">Estás empatando tu récord.</p>
          )}
          {currentStreak + 1 === bestStreak && (
            <p className="text-xs text-amber-100">Estás a 1 semana de superar tu récord.</p>
          )}
        </div>

        {difficultyLabel && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-left text-slate-100">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Dificultad actual</p>
            <p className="text-sm font-semibold text-slate-50">{difficultyLabel}</p>
            <DifficultyInsight difficultyLabel={difficultyLabel} habitHealthLevel={habitHealth.level} />
          </div>
        )}
      </div>
    </div>
  );
}

function MonthMiniChart({ days }: { days: Array<{ date: string; count: number }> }) {
  const maxCount = useMemo(() => days.reduce((max, day) => Math.max(max, day.count), 0) || 1, [days]);

  if (!days.length) {
    return <p className="text-sm text-slate-400">Sin registros en este mes.</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {days.map((day) => {
          const ratio = Math.min(1, Math.max(0, day.count / maxCount));
          const height = 12 + ratio * 48;
          return (
            <div key={day.date} className="flex flex-col items-center justify-end gap-1 text-[10px] text-slate-400">
              <div className="flex w-4 items-end justify-center rounded-full bg-white/5">
                <div
                  className={cx(
                    'w-[10px] rounded-full bg-gradient-to-b from-violet-200 via-fuchsia-200 to-sky-200 transition-all',
                    day.count === 0 && 'opacity-40',
                  )}
                  style={{ height }}
                />
              </div>
              <span>{formatDateLabel(day.date)}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Actividad diaria del mes (scroll horizontal para ver todos los días).</p>
    </div>
  );
}

function WeekMiniChart({
  days,
  referenceDate,
}: {
  days: Array<{ date: string; count: number }>;
  referenceDate?: Date;
}) {
  const weekEnd = useMemo(() => referenceDate ?? new Date(), [referenceDate]);
  const weekStart = useMemo(() => {
    const start = new Date(weekEnd);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return start;
  }, [weekEnd]);

  const countsByDay = useMemo(() => {
    return days.reduce<Map<string, number>>((map, day) => {
      map.set(day.date, day.count);
      return map;
    }, new Map());
  }, [days]);

  const timeline = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(weekStart);
      current.setDate(weekStart.getDate() + index);
      const key = current.toISOString().slice(0, 10);
      return {
        label: formatWeekdayLabel(current),
        count: countsByDay.get(key) ?? 0,
      };
    });
  }, [countsByDay, weekStart]);

  const maxCount = useMemo(() => timeline.reduce((max, day) => Math.max(max, day.count), 0) || 1, [timeline]);

  if (!timeline.some((day) => day.count > 0)) {
    return <p className="text-sm text-slate-400">Sin registros en esta semana.</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end justify-between gap-2 rounded-2xl bg-white/5 px-3 py-2">
        {timeline.map((day) => {
          const ratio = Math.min(1, Math.max(0, day.count / maxCount));
          const height = 10 + ratio * 48;
          return (
            <div key={day.label} className="flex flex-1 flex-col items-center justify-end gap-1 text-[11px] text-slate-300">
              <div className="flex w-full items-end justify-center rounded-full bg-white/5">
                <div
                  className={cx(
                    'w-[14px] rounded-full bg-gradient-to-b from-violet-200 via-fuchsia-200 to-sky-200 transition-all',
                    day.count === 0 && 'opacity-40',
                  )}
                  style={{ height }}
                />
              </div>
              <span className="font-semibold">{day.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Actividad diaria de la semana en curso.</p>
    </div>
  );
}

function QuarterMiniChart({
  timeline,
  referenceDate,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  referenceDate?: Date;
}) {
  const today = useMemo(() => referenceDate ?? new Date(), [referenceDate]);
  const quarterStart = useMemo(() => {
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 3);
    return start;
  }, [today]);

  const recentWeeks = useMemo(() => {
    const filtered = timeline.filter((week) => parseIsoDate(week.weekEnd) >= quarterStart);
    return filtered.slice(-13);
  }, [quarterStart, timeline]);

  const maxCount = useMemo(() => recentWeeks.reduce((max, week) => Math.max(max, week.count), 0) || 1, [recentWeeks]);

  if (!recentWeeks.length) {
    return <p className="text-sm text-slate-400">Sin registros en los últimos 3 meses.</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {recentWeeks.map((week, index) => {
          const ratio = Math.min(1, Math.max(0, week.count / maxCount));
          const height = 12 + ratio * 52;
          const weekEnd = parseIsoDate(week.weekEnd);
          const label = new Intl.DateTimeFormat('es-AR', { month: 'short', day: 'numeric' }).format(weekEnd);
          return (
            <div
              key={`${week.weekStart}-${week.weekEnd}-${index}`}
              className="flex flex-col items-center justify-end gap-1 text-[10px] text-slate-400"
            >
              <div className="flex w-6 items-end justify-center rounded-full bg-white/5">
                <div
                  className={cx(
                    'w-[14px] rounded-full transition-all',
                    week.hit
                      ? 'bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-400'
                      : 'bg-white/30 backdrop-blur',
                  )}
                  style={{ height }}
                />
              </div>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">Semanas de los últimos 3 meses (verde = objetivo cumplido).</p>
    </div>
  );
}

export function TaskInsightsModal({
  taskId,
  weeklyGoal,
  mode,
  range,
  onClose,
  fallbackTask,
  referenceDate,
}: TaskInsightsModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEscToClose(Boolean(taskId), onClose);

  const { data, status, error } = useRequest<TaskInsightsResponse>(
    () => {
      console.info('[TaskInsightsModal] getTaskInsights request', { taskId, weeklyGoal, mode, range });
      return getTaskInsights(taskId!, { mode, weeklyGoal, range });
    },
    [taskId, mode, range, weeklyGoal],
    { enabled: Boolean(taskId) },
  );

  const [activityScope, setActivityScope] = useState<ActivityScope>('month');

  useEffect(() => {
    if (taskId) {
      console.info('[TaskInsightsModal] Mounted overlay', { taskId, weeklyGoal, mode, range });
    }
  }, [mode, range, taskId, weeklyGoal]);

  const timeline = data?.weeks.timeline ?? [];
  const weeksSample = useMemo(() => {
    const sample = Number(data?.weeks?.weeksSample);
    if (Number.isFinite(sample) && sample > 0) {
      return Math.round(sample);
    }

    return timeline.length;
  }, [data?.weeks?.weeksSample, timeline.length]);
  const stats = useMemo(() => {
    const completionRate = data?.weeks.completionRate ?? 0;
    const currentStreak = data?.weeks.currentStreak ?? 0;
    const bestStreak = data?.weeks.bestStreak ?? 0;
    return { completionRate, currentStreak, bestStreak };
  }, [data]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    if (taskId) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [taskId]);

  const activeTask = data?.task ?? fallbackTask;
  const monthDays = data?.month.days ?? [];
  const monthTotal = data?.month.totalCount ?? fallbackTask?.monthCount ?? 0;
  const monthXp = data?.month.totalXp ?? fallbackTask?.monthXp ?? 0;
  const difficultyLabel =
    (activeTask as { difficultyLabel?: string | null })?.difficultyLabel ??
    (activeTask as { difficulty?: string | null })?.difficulty;

  const xpPerCompletion = useMemo(() => {
    if (monthTotal > 0 && monthXp > 0) {
      return monthXp / monthTotal;
    }
    return 0;
  }, [monthTotal, monthXp]);

  const weekActivity = useMemo(() => {
    const end = referenceDate ?? new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const countsByDay = monthDays.reduce<Map<string, number>>((map, day) => {
      map.set(day.date, day.count);
      return map;
    }, new Map());

    const timeline = Array.from({ length: 7 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const key = current.toISOString().slice(0, 10);
      return countsByDay.get(key) ?? 0;
    });

    return {
      totalCount: timeline.reduce((sum, value) => sum + value, 0),
    };
  }, [monthDays, referenceDate]);

  const quarterTimeline = useMemo(() => {
    const today = referenceDate ?? new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 3);

    const filtered = timeline.filter((week) => parseIsoDate(week.weekEnd) >= start);
    return filtered.slice(-13);
  }, [referenceDate, timeline]);

  const activityTotals = useMemo(() => {
    if (activityScope === 'week') {
      const xp = xpPerCompletion * weekActivity.totalCount;
      return { count: weekActivity.totalCount, xp: Math.round(xp) };
    }

    if (activityScope === 'quarter') {
      const totalCount = quarterTimeline.reduce((sum, week) => sum + week.count, 0);
      const xp = xpPerCompletion * totalCount;
      return { count: totalCount, xp: Math.round(xp) };
    }

    return { count: monthTotal, xp: Math.round(monthXp) };
  }, [activityScope, monthTotal, monthXp, quarterTimeline, weekActivity.totalCount, xpPerCompletion]);

  if (!taskId) {
    return null;
  }

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-2xl ring-1 ring-white/5 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Detalle de tarea"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-white/5 bg-slate-900/90 p-4 backdrop-blur supports-[backdrop-filter]:bg-slate-900/75">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Detalle de tarea</p>
            <h3 className="text-lg font-semibold leading-tight text-slate-50 md:text-xl">{activeTask?.name ?? 'Tarea'}</h3>
            {activeTask?.stat && <p className="text-sm text-slate-400">{activeTask.stat}</p>}
            {activeTask && 'description' in activeTask && activeTask.description && (
              <p className="text-sm text-slate-300">{activeTask.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            aria-label="Cerrar detalle"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2">
          <div className="mt-2 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100">Actividad</p>
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 text-[11px] font-semibold text-slate-100">
                        {[
                          { value: 'week', label: 'W' },
                          { value: 'month', label: 'M' },
                          { value: 'quarter', label: '3M' },
                        ].map((option) => {
                          const isActive = activityScope === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setActivityScope(option.value as ActivityScope)}
                              className={cx(
                                'rounded-full px-3 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                                isActive
                                  ? 'bg-white text-slate-900 shadow-inner shadow-white/30'
                                  : 'text-slate-200 hover:bg-white/10',
                              )}
                              aria-pressed={isActive}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-100">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5">
                      ✓×{numberFormatter.format(activityTotals.count)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-0.5">
                      +{numberFormatter.format(activityTotals.xp)} XP
                    </span>
                  </div>
                </div>
              </div>
              {status === 'loading' && <div className="mt-3 h-24 animate-pulse rounded-xl bg-white/10" aria-hidden />}
              {status === 'success' && activityScope === 'week' && (
                <WeekMiniChart days={monthDays} referenceDate={referenceDate} />
              )}
              {status === 'success' && activityScope === 'month' && <MonthMiniChart days={monthDays} />}
              {status === 'success' && activityScope === 'quarter' && (
                <QuarterMiniChart timeline={timeline} referenceDate={referenceDate} />
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">Progreso semanal</p>
                <span className="text-xs text-slate-400">Objetivo: {weeklyGoal}x/sem</span>
              </div>
              {status === 'loading' && (
                <div className="mt-3 h-36 animate-pulse rounded-xl bg-white/10" aria-hidden />
              )}
              {status === 'error' && (
                <p className="mt-2 text-sm text-rose-300">No pudimos cargar la serie semanal: {error?.message}</p>
              )}
              {status === 'success' && (
                <WeeklyCompletionDonut
                  timeline={timeline}
                  weeklyGoal={weeklyGoal}
                  currentStreak={stats.currentStreak}
                  bestStreak={stats.bestStreak}
                  completionRate={stats.completionRate}
                  difficultyLabel={difficultyLabel}
                  weeksSample={weeksSample}
                  referenceDate={referenceDate}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Racha actual</p>
                <p className="mt-1 text-3xl font-semibold text-slate-50">🔥 {stats.currentStreak}</p>
                <p className="text-xs text-slate-400">semanas seguidas</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mejor racha</p>
                <p className="mt-1 text-3xl font-semibold text-slate-50">{stats.bestStreak}</p>
                <p className="text-xs text-slate-400">máxima racha lograda</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
