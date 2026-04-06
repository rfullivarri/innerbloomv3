import type { TaskInsightsResponse } from './api';

type HabitHealthLevel = 'strong' | 'medium' | 'weak';

type HabitHealthLocale = 'es' | 'en';

export type HabitHealth = { level: HabitHealthLevel; label: string };

export function getHabitHealth(weeklyHitRatePct: number, weeksSample: number, locale: HabitHealthLocale = 'es'): HabitHealth {
  if (weeklyHitRatePct >= 80) return { level: 'strong', label: locale === 'es' ? 'Hábito fuerte' : 'Strong habit' };
  if (weeklyHitRatePct >= 50) return { level: 'medium', label: locale === 'es' ? 'Hábito en construcción' : 'Habit in progress' };
  return { level: 'weak', label: locale === 'es' ? 'Hábito frágil' : 'Fragile habit' };
}

function isCurrentWeek(week: { weekStart: string; weekEnd: string }, referenceDate: Date): boolean {
  const start = new Date(week.weekStart);
  const end = new Date(week.weekEnd);

  return start <= referenceDate && referenceDate <= end;
}

export function computeWeeklyHabitHealth({
  timeline,
  completionRate,
  weeksSample,
  referenceDate,
  locale = 'es',
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  completionRate?: number | null;
  weeksSample?: number | null;
  referenceDate?: Date;
  locale?: HabitHealthLocale;
}): {
  completionPercent: number;
  completedWeeks: number;
  totalWeeks: number;
  habitHealth: HabitHealth;
} {
  const today = referenceDate ?? new Date();
  const parsedWeeksSample = Number(weeksSample);
  const parsedCompletionRate = typeof completionRate === 'number' ? completionRate : null;
  const normalizedWeeksSample =
    Number.isFinite(parsedWeeksSample) && parsedWeeksSample > 0
      ? Math.round(parsedWeeksSample)
      : timeline.length;
  const timelineWithoutCurrentWeek = timeline.filter((week) => !isCurrentWeek(week, today));
  const currentWeekIncluded = timeline.length !== timelineWithoutCurrentWeek.length;
  const weeksSampleWithoutCurrent = Math.max(0, normalizedWeeksSample - (currentWeekIncluded ? 1 : 0));
  const totalWeeks = Math.max(timelineWithoutCurrentWeek.length, weeksSampleWithoutCurrent);
  const completedWeeks = timelineWithoutCurrentWeek.length
    ? timelineWithoutCurrentWeek.filter((week) => week.hit).length
    : Math.round(((parsedCompletionRate ?? 0) / 100) * totalWeeks);
  const completionPercent = parsedCompletionRate !== null ? Math.round(parsedCompletionRate) : 0;
  const habitHealth = getHabitHealth(completionPercent, totalWeeks, locale);

  return {
    completionPercent,
    completedWeeks,
    totalWeeks,
    habitHealth,
  };
}
