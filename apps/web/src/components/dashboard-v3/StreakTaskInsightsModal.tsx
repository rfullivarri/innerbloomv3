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

const STATUS_COLORS = {
  positive: 'bg-emerald-400/90 text-emerald-950 border-emerald-100/60',
  caution: 'bg-amber-400/90 text-amber-950 border-amber-100/60',
  negative: 'bg-rose-400/90 text-rose-950 border-rose-100/60',
};

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

function WeekTimeline({
  timeline,
  weeklyGoal,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  weeklyGoal: number;
}) {
  if (!timeline.length) {
    return <p className="text-sm text-slate-400">Aún no registramos semanas para esta tarea.</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {timeline.map((week) => (
          <div
            key={week.weekStart}
            className={cx(
              'flex min-w-[54px] flex-1 items-center justify-between rounded-lg border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm transition',
              week.hit
                ? 'border-emerald-200/60 bg-emerald-300/15 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-white/10 bg-white/5 text-slate-200',
            )}
          >
            <span className="text-[10px] text-slate-300">S{week.weekStart.slice(5)}</span>
            <span className={week.hit ? 'text-emerald-100' : 'text-slate-300'}>
              {week.count}/{weeklyGoal}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">Últimas {timeline.length} semanas (OK si supera la meta semanal).</p>
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
  const completionColor = stats.completionRate >= 70 ? 'positive' : stats.completionRate >= 40 ? 'caution' : 'negative';

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl rounded-t-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-4 shadow-2xl ring-1 ring-white/5 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Detalle de tarea"
      >
        <div className="flex items-start justify-between gap-2">
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
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/10"
            aria-label="Cerrar detalle"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Veces este mes</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">{monthTotal}</p>
            <p className="text-xs text-slate-400">Promueve consistencia semanal.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">% semanas OK</p>
            <span
              className={cx(
                'mt-1 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
                STATUS_COLORS[completionColor],
              )}
            >
              {stats.completionRate}%
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-700">hit</span>
            </span>
            <p className="text-xs text-slate-400">Meta semanal ≥ {weeklyGoal} veces.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-inner">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rachas semanales</p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">{stats.currentStreak}🔥</p>
            <p className="text-xs text-slate-400">Mejor racha: {stats.bestStreak} semanas.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Timeline semanal</p>
              <span className="text-xs text-slate-400">Objetivo: {weeklyGoal}x/sem</span>
            </div>
            {status === 'loading' && (
              <div className="mt-3 h-20 animate-pulse rounded-xl bg-white/10" aria-hidden />
            )}
            {status === 'error' && (
              <p className="mt-2 text-sm text-rose-300">No pudimos cargar la serie semanal: {error?.message}</p>
            )}
            {status === 'success' && <WeekTimeline timeline={timeline} weeklyGoal={weeklyGoal} />}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Actividad del mes</p>
              <span className="text-xs text-slate-400">Días con registro</span>
            </div>
            {status === 'loading' && <div className="mt-3 h-24 animate-pulse rounded-xl bg-white/10" aria-hidden />}
            {status === 'success' && <MonthMiniChart days={monthDays} />}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
