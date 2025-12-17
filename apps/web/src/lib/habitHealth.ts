import type { TaskInsightsResponse } from './api';

type HabitHealthLevel = 'strong' | 'medium' | 'weak';

export type HabitHealth = { level: HabitHealthLevel; label: string };

export function getHabitHealth(weeklyHitRatePct: number, weeksSample: number): HabitHealth {
  if (weeklyHitRatePct >= 80) return { level: 'strong', label: 'Hábito fuerte' };
  if (weeklyHitRatePct >= 50) return { level: 'medium', label: 'Hábito en construcción' };
  return { level: 'weak', label: 'Hábito frágil' };
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
}: {
  timeline: TaskInsightsResponse['weeks']['timeline'];
  completionRate?: number | null;
  weeksSample?: number | null;
  referenceDate?: Date;
}): {
  completionPercent: number;
  completedWeeks: number;
  totalWeeks: number;
  habitHealth: HabitHealth;
} {
  const today = referenceDate ?? new Date();
  const parsedWeeksSample = Number(weeksSample);
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
    : Math.round(((Number.isFinite(completionRate) ? completionRate : 0) / 100) * totalWeeks);
  const completionPercent = Number.isFinite(completionRate) ? Math.round(completionRate) : 0;
  const habitHealth = getHabitHealth(completionPercent, totalWeeks);

  return {
    completionPercent,
    completedWeeks,
    totalWeeks,
    habitHealth,
  };
}
