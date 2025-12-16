import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef } from 'react';
import type { StreakPanelRange, StreakPanelTask } from '../../lib/api';
import { getTaskInsights, type TaskInsightsResponse } from '../../lib/api';
import { useRequest } from '../../hooks/useRequest';
import type { GameMode } from '../../lib/gameMode';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type TaskSummary = Pick<StreakPanelTask, 'id' | 'name' | 'stat'> & { highlight?: boolean };

type TaskInsightsModalProps = {
  taskId: string | null;
  weeklyGoal: number;
  mode: GameMode;
  range: StreakPanelRange;
  onClose: () => void;
  fallbackTask?: TaskSummary | null;
};

type HabitHealthLevel = 'strong' | 'medium' | 'weak';

export function getHabitHealth(weeklyHitRatePct: number, weeksSample: number): {
  level: HabitHealthLevel;
  label: string;
} {
  if (weeklyHitRatePct >= 80) return { level: 'strong', label: 'Hábito fuerte' };
  if (weeklyHitRatePct >= 55) return { level: 'medium', label: 'Hábito en construcción' };
  return { level: 'weak', label: 'Hábito frágil' };
}

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

function WeeklyCompletionDonut({
  timeline,
  weeklyGoal,
  currentStreak,
  bestStreak,
  completionRate,
  difficultyLabel,
  weeksSample,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  weeklyGoal: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  difficultyLabel?: string | null;
  weeksSample?: number | null;
}) {
  const parsedWeeksSample = Number(weeksSample);
  const normalizedWeeksSample =
    Number.isFinite(parsedWeeksSample) && parsedWeeksSample > 0
      ? Math.round(parsedWeeksSample)
      : timeline.length;
  const totalWeeks = normalizedWeeksSample || timeline.length;
  const completedWeeks = timeline.length
    ? timeline.filter((week) => week.hit).length
    : Math.round(((Number.isFinite(completionRate) ? completionRate : 0) / 100) * totalWeeks);
  const completionPercent = Number.isFinite(completionRate) ? Math.round(completionRate) : 0;
  const habitHealth = getHabitHealth(completionPercent, totalWeeks);

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
          <p className="text-xs text-slate-200">Cumplís tu meta en {completedWeeks} de {totalWeeks} semanas.</p>
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
    <div className="space-y-1.5">
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

export function TaskInsightsModal({ taskId, weeklyGoal, mode, range, onClose, fallbackTask }: TaskInsightsModalProps) {
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

  if (!taskId) {
    return null;
  }

  const activeTask = data?.task ?? fallbackTask;
  const monthDays = data?.month.days ?? [];
  const monthTotal = data?.month.totalCount ?? 0;
  const difficultyLabel =
    (activeTask as { difficultyLabel?: string | null })?.difficultyLabel ??
    (activeTask as { difficulty?: string | null })?.difficulty;

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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">Actividad del mes</p>
                <span className="text-xs text-slate-400">Veces este mes: {monthTotal} · Objetivo: {weeklyGoal}x/sem</span>
              </div>
              {status === 'loading' && <div className="mt-3 h-24 animate-pulse rounded-xl bg-white/10" aria-hidden />}
              {status === 'success' && <MonthMiniChart days={monthDays} />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
