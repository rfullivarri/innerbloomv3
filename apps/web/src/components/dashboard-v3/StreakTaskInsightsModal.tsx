import { createPortal } from 'react-dom';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { StreakPanelRange, StreakPanelTask } from '../../lib/api';
import { getTaskInsights, type TaskInsightsResponse } from '../../lib/api';
import { computeWeeklyHabitHealth } from '../../lib/habitHealth';
import { useRequest } from '../../hooks/useRequest';
import type { GameMode } from '../../lib/gameMode';
import { usePostLoginLanguage, type PostLoginLanguage } from '../../i18n/postLoginLanguage';
import { PreviewAchievementCard } from './PreviewAchievementCard';

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type TaskSummary = Pick<StreakPanelTask, 'id' | 'name' | 'stat'> & {
  highlight?: boolean;
  monthCount?: number;
  monthXp?: number;
};

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
type RecalibrationAction = 'up' | 'keep' | 'down' | 'none';

type RecalibrationRecord = {
  action?: string | null;
  periodLabel?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  expectedTarget?: number | null;
  completions?: number | null;
  completionRate?: number | null;
  reason?: string | null;
  clampApplied?: boolean | null;
  clampReason?: string | null;
  recalibratedAt?: string | null;
};
type Translate = (key: string, params?: Record<string, string | number>) => string;

function normalizeRecalibrationAction(value: string | null | undefined): RecalibrationAction {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'up' || normalized === 'keep' || normalized === 'down') {
    return normalized;
  }
  return 'none';
}

function formatCompactDate(value: string | null | undefined, locale: PostLoginLanguage): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', { month: 'short', day: 'numeric' }).format(parsed);
}

function formatPeriodLabel(record: RecalibrationRecord, locale: PostLoginLanguage, t: Translate): string {
  const periodValue = record.periodStart ?? record.periodEnd ?? record.recalibratedAt ?? null;
  if (periodValue) {
    const parsed = new Date(periodValue);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', { month: 'long' }).format(parsed);
    }
  }
  return t('dashboard.streakTaskInsights.recalibration.recentMonth');
}

function sanitizeRecalibrationReason(reason: string | null | undefined): string {
  if (!reason) return '';
  return reason.replace(/^Historical row migrated:\s*/i, '').trim();
}

function getRecalibrationReasonLabel(reason: string | null | undefined, locale: PostLoginLanguage, t: Translate): string {
  const sanitized = sanitizeRecalibrationReason(reason);
  if (!sanitized) {
    return t('dashboard.streakTaskInsights.recalibration.reasonFallback');
  }
  const normalized = sanitized.toLowerCase().replace(/[.!]+$/g, '').trim();
  if (normalized.includes('completion rate above 80%') && normalized.includes('decreasing difficulty')) {
    return t('dashboard.streakTaskInsights.recalibration.reason.highCompletion');
  }
  if (normalized.includes('completion rate between 50% and 79%') && normalized.includes('difficulty kept')) {
    return t('dashboard.streakTaskInsights.recalibration.reason.mediumCompletion');
  }
  if (normalized.includes('completion rate below 50%') && normalized.includes('increasing difficulty')) {
    return t('dashboard.streakTaskInsights.recalibration.reason.lowCompletion');
  }
  return locale === 'es' ? t('dashboard.streakTaskInsights.recalibration.reasonUnknown') : sanitized;
}

function getRecalibrationActionLabel(action: RecalibrationAction, t: Translate): string {
  if (action === 'down') return t('dashboard.streakTaskInsights.recalibration.action.down');
  if (action === 'up') return t('dashboard.streakTaskInsights.recalibration.action.up');
  return t('dashboard.streakTaskInsights.recalibration.action.keep');
}

function localizeDifficultyChipLabel(
  difficulty: string | null | undefined,
  locale: PostLoginLanguage,
): string | null {
  const normalized = (difficulty ?? '').trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const labels = {
    easy: locale === 'es' ? 'Fácil' : 'Easy',
    medium: locale === 'es' ? 'Media' : 'Medium',
    hard: locale === 'es' ? 'Difícil' : 'Hard',
  } as const;

  return labels[normalized as keyof typeof labels] ?? difficulty?.trim() ?? null;
}

function RecalibrationTrendIndicator({
  latest,
  eligible,
  tooltipLabel,
  onToggleTooltip,
  onOpenTooltip,
  tooltipOpen,
  onCloseTooltip,
  tooltipId,
}: {
  latest: RecalibrationRecord | null;
  eligible: boolean;
  tooltipLabel: string;
  onToggleTooltip: () => void;
  onOpenTooltip: () => void;
  tooltipOpen: boolean;
  onCloseTooltip: () => void;
  tooltipId: string;
}) {
  const action = normalizeRecalibrationAction(latest?.action);

  const config: Record<Exclude<RecalibrationAction, 'none'>, { icon: string; tone: string }> = {
    down: { icon: '↓', tone: 'border-emerald-500/70 bg-emerald-300 text-emerald-950 dark:border-emerald-400/60 dark:bg-emerald-500 dark:text-emerald-950' },
    keep: { icon: '•', tone: 'border-amber-500/70 bg-amber-300 text-amber-950 dark:border-amber-400/60 dark:bg-amber-400 dark:text-amber-950' },
    up: { icon: '↑', tone: 'border-rose-500/70 bg-rose-300 text-rose-950 dark:border-rose-400/60 dark:bg-rose-500 dark:text-rose-950' },
  };

  const fallback = !latest || action === 'none' || !eligible;

  useEffect(() => {
    if (!tooltipOpen) return;
    const listener = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-recalibration-tooltip]')) {
        onCloseTooltip();
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [onCloseTooltip, tooltipOpen]);

  return (
    <div className="relative" data-recalibration-tooltip>
      <button
        type="button"
        onClick={onToggleTooltip}
        onMouseEnter={onOpenTooltip}
        onMouseLeave={onCloseTooltip}
        className={cx(
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/50',
          fallback ? 'border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] text-[color:var(--color-slate-300)]' : config[action].tone,
        )}
        aria-label={tooltipLabel}
        aria-describedby={tooltipOpen ? tooltipId : undefined}
      >
        {fallback ? '•' : config[action].icon}
      </button>
      {tooltipOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-8 z-20 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] p-2 text-xs text-[color:var(--color-slate-200)] shadow-xl"
        >
          {tooltipLabel}
        </div>
      )}
    </div>
  );
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

function formatWeekdayLabel(date: Date, locale: PostLoginLanguage): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : 'en-US', { weekday: 'narrow' }).format(date).toUpperCase();
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
  weeksSample,
  referenceDate,
  progressAriaLabel,
  t,
  language,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  weeklyGoal: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
  weeksSample?: number | null;
  referenceDate?: Date;
  progressAriaLabel: string;
  t: Translate;
  language: PostLoginLanguage;
}) {
  const today = useMemo(() => referenceDate ?? new Date(), [referenceDate]);
  const parsedWeeksSample = Number(weeksSample);
  const { completionPercent, completedWeeks, totalWeeks, habitHealth } = computeWeeklyHabitHealth({
    timeline,
    completionRate,
    weeksSample: parsedWeeksSample,
    referenceDate: today,
    locale: language,
  });

  const healthStyles: Record<HabitHealthLevel, string> = {
    strong: 'bg-emerald-300 text-emerald-950',
    medium: 'bg-amber-300 text-amber-950',
    weak: 'bg-rose-300 text-rose-950',
  };

  if (!timeline.length) {
    return <p className="text-sm text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.weeklyProgress.empty')}</p>;
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
        aria-label={progressAriaLabel.replace("{{progress}}", String(progress))}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-[color:var(--color-border-subtle)]"
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
          className="fill-[color:var(--color-text)] text-[20px] font-semibold"
        >
          {progress}%
        </text>
      </svg>

      <div className="flex-1 space-y-2 text-center text-xs text-[color:var(--color-slate-300)] sm:text-left">
        <div className="space-y-1">
          <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold', healthStyles[habitHealth.level])}>
            {t(`dashboard.streakTaskInsights.habitHealth.${habitHealth.level}`)}
          </span>
          <p className="text-xs text-[color:var(--color-slate-200)]">
            {t('dashboard.streakTaskInsights.weeklyProgress.goalReached', { completed: completedWeeks, total: totalWeeks })}
          </p>
        </div>

        <div className="space-y-0.5 text-[color:var(--color-slate-100)]">
          {currentStreak === bestStreak && bestStreak > 0 && (
            <p className="text-xs text-emerald-100">{t('dashboard.streakTaskInsights.streak.tieRecord')}</p>
          )}
          {currentStreak + 1 === bestStreak && (
            <p className="text-xs text-amber-100">{t('dashboard.streakTaskInsights.streak.oneAway')}</p>
          )}
        </div>

      </div>
    </div>
  );
}

function MonthMiniChart({ days, t }: { days: Array<{ date: string; count: number }>; t: Translate }) {
  const maxCount = useMemo(() => days.reduce((max, day) => Math.max(max, day.count), 0) || 1, [days]);

  if (!days.length) {
    return <p className="text-sm text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.empty.month')}</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {days.map((day) => {
          const ratio = Math.min(1, Math.max(0, day.count / maxCount));
          const height = 12 + ratio * 48;
          return (
            <div key={day.date} className="flex flex-col items-center justify-end gap-1 text-[10px] text-[color:var(--color-slate-400)]">
              <div className="flex w-4 items-end justify-center rounded-full bg-[color:var(--color-overlay-1)]">
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
      <p className="text-[11px] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.caption.month')}</p>
    </div>
  );
}

function WeekMiniChart({
  days,
  referenceDate,
  t,
  language,
}: {
  days: Array<{ date: string; count: number }>;
  referenceDate?: Date;
  t: Translate;
  language: PostLoginLanguage;
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
        label: formatWeekdayLabel(current, language),
        count: countsByDay.get(key) ?? 0,
      };
    });
  }, [countsByDay, language, weekStart]);

  const maxCount = useMemo(() => timeline.reduce((max, day) => Math.max(max, day.count), 0) || 1, [timeline]);

  if (!timeline.some((day) => day.count > 0)) {
    return <p className="text-sm text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.empty.week')}</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end justify-between gap-2 rounded-2xl bg-[color:var(--color-overlay-1)] px-3 py-2">
        {timeline.map((day) => {
          const ratio = Math.min(1, Math.max(0, day.count / maxCount));
          const height = 10 + ratio * 48;
          return (
            <div key={day.label} className="flex flex-1 flex-col items-center justify-end gap-1 text-[11px] text-[color:var(--color-slate-300)]">
              <div className="flex w-full items-end justify-center rounded-full bg-[color:var(--color-overlay-1)]">
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
      <p className="text-[11px] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.caption.week')}</p>
    </div>
  );
}

function QuarterMiniChart({
  timeline,
  referenceDate,
  language,
  t,
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  referenceDate?: Date;
  language: PostLoginLanguage;
  t: Translate;
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
    return <p className="text-sm text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.empty.quarter')}</p>;
  }

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-end gap-1 overflow-x-auto pb-1">
        {recentWeeks.map((week, index) => {
          const ratio = Math.min(1, Math.max(0, week.count / maxCount));
          const height = 12 + ratio * 52;
          const weekEnd = parseIsoDate(week.weekEnd);
          const label = new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', { month: 'short', day: 'numeric' }).format(weekEnd);
          return (
            <div
              key={`${week.weekStart}-${week.weekEnd}-${index}`}
              className="flex flex-col items-center justify-end gap-1 text-[10px] text-[color:var(--color-slate-400)]"
            >
              <div className="flex w-6 items-end justify-center rounded-full bg-[color:var(--color-overlay-1)]">
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
      <p className="text-[11px] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.activity.caption.quarter')}</p>
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
  const { t, language } = usePostLoginLanguage();
  const numberFormatter = useMemo(() => new Intl.NumberFormat(language === 'es' ? 'es-AR' : 'en-US'), [language]);
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
  const difficultyChipLabel = localizeDifficultyChipLabel(difficultyLabel, language);
  const achievementSealVisible = Boolean((activeTask as { achievementSealVisible?: boolean })?.achievementSealVisible);
  const recalibration = data?.recalibration ?? null;
  const recalibrationHistory = (recalibration?.history ?? []).slice(0, 3);
  const recalibrationLatest = recalibration?.latest ?? recalibrationHistory[0] ?? null;
  const isRecalibrationEligible = recalibration?.eligible ?? Boolean(recalibrationLatest || recalibrationHistory.length);
  const [isRecalibrationTooltipOpen, setIsRecalibrationTooltipOpen] = useState(false);
  const recalibrationTooltipId = useId();

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
  const previewAchievement = data?.previewAchievement ?? null;

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
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 px-3 py-4 backdrop-blur-sm md:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[color:var(--color-border-subtle)] bg-gradient-to-b from-[color:var(--color-surface)] via-[color:var(--color-surface)] to-[color:var(--color-surface-muted)] shadow-2xl ring-1 ring-white/5 md:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label={t('dashboard.streakTaskInsights.dialogAria')}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-white/5 bg-[color:var(--color-surface)]/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-surface)]/85">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.title')}</p>
            <h3 className="text-lg font-semibold leading-tight text-[color:var(--color-text)] md:text-xl">{activeTask?.name ?? t('dashboard.streakTaskInsights.taskFallback')}</h3>
            <div className="flex flex-wrap items-center gap-2">
              {activeTask?.stat && <p className="text-sm text-[color:var(--color-slate-400)]">{activeTask.stat}</p>}
              {achievementSealVisible && (
                <span className="inline-flex items-center rounded-full border border-amber-500 bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                  {t('dashboard.streakTaskInsights.achievementSeal')}
                </span>
              )}
              {difficultyChipLabel && (
                <span className="inline-flex items-center rounded-full border border-violet-200/80 bg-violet-100/90 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:border-white/30 dark:bg-white/10 dark:text-white/85">
                  {difficultyChipLabel}
                </span>
              )}
              <RecalibrationTrendIndicator
                latest={recalibrationLatest}
                eligible={isRecalibrationEligible}
                tooltipLabel={
                  isRecalibrationEligible && recalibrationLatest
                    ? t('dashboard.streakTaskInsights.recalibration.tooltip.latest')
                    : t('dashboard.streakTaskInsights.recalibration.tooltip.empty')
                }
                tooltipOpen={isRecalibrationTooltipOpen}
                onToggleTooltip={() => setIsRecalibrationTooltipOpen((prev) => !prev)}
                onOpenTooltip={() => setIsRecalibrationTooltipOpen(true)}
                onCloseTooltip={() => setIsRecalibrationTooltipOpen(false)}
                tooltipId={recalibrationTooltipId}
              />
            </div>
            {activeTask && 'description' in activeTask && activeTask.description && (
              <p className="text-sm text-[color:var(--color-slate-300)]">{activeTask.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-sm text-[color:var(--color-slate-200)] transition hover:border-white/25 hover:bg-[color:var(--color-overlay-2)]"
            aria-label={t('dashboard.streakTaskInsights.closeAria')}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2">
          <div className="mt-2 space-y-3">
            <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--color-slate-100)]">{t('dashboard.streakTaskInsights.activity')}</p>
                    <div className="flex justify-center">
                      <div className="inline-flex w-full max-w-[240px] items-center justify-between gap-1 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-slate-100)]">
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
                                'flex-1 rounded-full px-3 py-0.5 text-[11px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)]',
                                isActive
                                  ? 'bg-white text-slate-900 shadow-inner shadow-white/30'
                                  : 'text-[color:var(--color-slate-200)] hover:bg-[color:var(--color-overlay-2)]',
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

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[color:var(--color-slate-100)]">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] px-2 py-0.5">
                      {numberFormatter.format(activityTotals.count)}d
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-400/10 px-2 py-0.5">
                      +{numberFormatter.format(activityTotals.xp)} GP
                    </span>
                  </div>
                </div>
              </div>
              {status === 'loading' && <div className="mt-3 h-24 animate-pulse rounded-xl bg-[color:var(--color-overlay-2)]" aria-hidden />}
              {status === 'success' && activityScope === 'week' && (
                <WeekMiniChart days={monthDays} referenceDate={referenceDate} t={t} language={language} />
              )}
              {status === 'success' && activityScope === 'month' && <MonthMiniChart days={monthDays} t={t} />}
              {status === 'success' && activityScope === 'quarter' && (
                <QuarterMiniChart timeline={timeline} referenceDate={referenceDate} language={language} t={t} />
              )}
            </div>

            {status === 'loading' && (
              <div className="h-36 animate-pulse rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)]" aria-hidden />
            )}
            {status === 'error' && (
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
                <p className="text-sm text-rose-300">{t('dashboard.streakTaskInsights.weeklyProgress.error', { message: error?.message ?? '—' })}</p>
              </div>
            )}
            {status === 'success' && previewAchievement && (
              <PreviewAchievementCard previewAchievement={previewAchievement} language={language} />
            )}
            {status === 'success' && !previewAchievement && (
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--color-slate-100)]">{t('dashboard.streakTaskInsights.weeklyProgress')}</p>
                  <span className="text-xs text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.goal', { goal: weeklyGoal })}</span>
                </div>
                <WeeklyCompletionDonut
                  timeline={timeline}
                  weeklyGoal={weeklyGoal}
                  currentStreak={stats.currentStreak}
                  bestStreak={stats.bestStreak}
                  completionRate={stats.completionRate}
                  weeksSample={weeksSample}
                  referenceDate={referenceDate}
                  progressAriaLabel={t('dashboard.streakTaskInsights.weeklyProgressAria')}
                  t={t}
                  language={language}
                />
              </div>
            )}


            <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[color:var(--color-slate-100)]">{t('dashboard.streakTaskInsights.recalibration.title')}</p>
                {recalibrationLatest?.recalibratedAt && (
                  <span className="text-[11px] text-[color:var(--color-slate-400)]">
                    {t('dashboard.streakTaskInsights.recalibration.latest', { date: formatCompactDate(recalibrationLatest.recalibratedAt, language) })}
                  </span>
                )}
              </div>
              {status === 'loading' && <div className="mt-2 h-16 animate-pulse rounded-xl bg-[color:var(--color-overlay-2)]" aria-hidden />}
              {status === 'success' && recalibrationHistory.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {recalibrationHistory.map((record, index) => {
                    const action = normalizeRecalibrationAction(record.action);
                    const actionTone =
                      action === 'down'
                        ? 'text-emerald-950 border-emerald-600 bg-emerald-500'
                        : action === 'up'
                          ? 'text-rose-950 border-rose-600 bg-rose-500'
                          : 'text-amber-950 border-amber-500 bg-amber-400';
                    const actionLabel = getRecalibrationActionLabel(action, t);
                    const expected = Number(record.expectedTarget ?? 0);
                    const completions = Number(record.completions ?? 0);
                    const completionRatePct = Number(record.completionRate ?? 0) * 100;
                    const completionSummary = t('dashboard.streakTaskInsights.recalibration.summary', {
                      completions,
                      expected: expected > 0 ? numberFormatter.format(expected) : '—',
                      rate: Number.isFinite(completionRatePct) ? completionRatePct.toFixed(1) : '0.0',
                    });
                    const reasonLabel = getRecalibrationReasonLabel(record.reason, language, t);

                    return (
                      <li
                        key={`${record.periodStart ?? 'period'}-${index}`}
                        className="flex flex-col items-start gap-1.5 rounded-xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] px-2.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold leading-tight text-[color:var(--color-slate-100)]">{formatPeriodLabel(record, language, t)}</p>
                          <p className="mt-0.5 text-[10px] leading-tight text-[color:var(--color-slate-400)]">{completionSummary}</p>
                          <p className="mt-1 text-[10px] leading-snug text-[color:var(--color-slate-500)]">{reasonLabel}</p>
                        </div>
                        <span className={cx('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none sm:mt-0.5', actionTone)}>
                          {actionLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {status === 'success' && recalibrationHistory.length === 0 && (
                <p className="mt-2 text-xs text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.recalibration.empty')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.currentStreak')}</p>
                <p className="mt-1 text-3xl font-semibold text-[color:var(--color-text)]">🔥 {stats.currentStreak}</p>
                <p className="text-xs text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.streak.weeksInRow')}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 shadow-inner">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.bestStreak')}</p>
                <p className="mt-1 text-3xl font-semibold text-[color:var(--color-text)]">{stats.bestStreak}</p>
                <p className="text-xs text-[color:var(--color-slate-400)]">{t('dashboard.streakTaskInsights.streak.bestLabel')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
