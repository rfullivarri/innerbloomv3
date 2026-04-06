import { pool } from '../db.js';
import { DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS } from './habitAchievementService.js';

type ClosedMonthRow = {
  period_end: string;
  completion_rate: number | string;
  expected_target: number | string;
  completions_done: number | string;
};

type CompletionRow = { completed: number | string | null };

type WeeklyTargetRow = { weekly_target: number | string | null };

type SlotState = 'valid' | 'floor_only' | 'invalid' | 'projected_valid' | 'projected_floor_only' | 'projected_invalid' | 'no_data';
type SlotValue = 'valid' | 'floor_only' | 'invalid' | 'projected_valid' | 'projected_floor_only' | 'projected_invalid' | 'empty';

type MonthRateInput = {
  periodKey: string;
  closed: boolean;
  completionRate: number | null;
  projectedCompletionRate: number | null;
  state: SlotState;
};

export type PreviewAchievement = {
  status: 'fragile' | 'building' | 'strong';
  score: number;
  currentMonth: {
    periodKey: string;
    completionRateSoFar: number;
    projectedMonthEndRate: number;
    expectedTargetSoFar: number;
    completionsDoneSoFar: number;
    expectedTargetMonthEnd: number;
    projectedCompletionsMonthEnd: number;
  };
  recentMonths: MonthRateInput[];
  windowProximity: {
    slots: SlotValue[];
    validMonths: number;
    monthsBelowFloor: number;
    aggregateProjected3mRate: number;
  };
  components: {
    currentMonthMomentumScore: number;
    recentClosedMonthsScore: number;
    achievementWindowProximityScore: number;
  };
};

export function normalizeMonthlyRateToScore(rate: number): number {
  const x = Number.isFinite(rate) ? Math.max(0, rate) : 0;
  if (x <= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold) {
    return (x / DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold) * 35;
  }
  if (x < DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold) {
    return 35 + ((x - DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold) / 0.3) * 45;
  }
  return 80 + Math.min((x - DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold) / 0.2, 1) * 20;
}

function clamp01To100(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function rateState(rate: number | null, projected: boolean): SlotState {
  if (rate == null || !Number.isFinite(rate)) return 'no_data';
  if (rate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold) {
    return projected ? 'projected_valid' : 'valid';
  }
  if (rate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold) {
    return projected ? 'projected_floor_only' : 'floor_only';
  }
  return projected ? 'projected_invalid' : 'invalid';
}

function asPeriodKey(dateText: string): string {
  return dateText.slice(0, 7);
}

function toDateOnly(input: Date): Date {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function daysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function scoreRecentClosedMonths(closedRates: number[]): number {
  if (closedRates.length === 0) return 0;
  const weights = [0.5, 0.3, 0.2].slice(0, closedRates.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const weighted = closedRates.reduce((sum, rate, index) => sum + normalizeMonthlyRateToScore(rate) * (weights[index] ?? 0), 0);
  return clamp01To100(weighted / totalWeight);
}

export function computePreviewAchievementFromRates(params: {
  periodKey: string;
  completionRateSoFar: number;
  projectedMonthEndRate: number;
  expectedTargetSoFar: number;
  completionsDoneSoFar: number;
  expectedTargetMonthEnd: number;
  projectedCompletionsMonthEnd: number;
  recentClosedMonths: Array<{ periodKey: string; completionRate: number; expectedTarget: number; completionsDone: number }>;
}): PreviewAchievement {
  const currentMonthMomentumScore = clamp01To100(
    0.45 * normalizeMonthlyRateToScore(params.completionRateSoFar) +
      0.55 * normalizeMonthlyRateToScore(params.projectedMonthEndRate),
  );

  const closedMonthsForScore = params.recentClosedMonths.slice(0, 3).map((month) => month.completionRate);
  const recentClosedMonthsScore = scoreRecentClosedMonths(closedMonthsForScore);

  const m2 = params.recentClosedMonths[1] ?? null;
  const m1 = params.recentClosedMonths[0] ?? null;
  const currentRate = params.projectedMonthEndRate;

  const candidateRates: Array<number | null> = [m2?.completionRate ?? null, m1?.completionRate ?? null, currentRate];
  const slots: SlotValue[] = candidateRates.map((rate, index) => {
    if (rate == null) return 'empty';
    const isProjected = index === 2;
    return rateState(rate, isProjected) as SlotValue;
  });

  const slotValue = (slot: SlotValue): number => {
    if (slot === 'valid' || slot === 'projected_valid') return 1;
    if (slot === 'floor_only' || slot === 'projected_floor_only') return 0.45;
    return 0;
  };

  const validMonths = candidateRates.filter(
    (rate) => rate != null && rate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold,
  ).length;
  const monthsBelowFloor = candidateRates.filter(
    (rate) => rate != null && rate < DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold,
  ).length;
  const aggregateProjected3mRate = candidateRates.reduce<number>((sum, rate) => sum + (rate ?? 0), 0) / 3;

  const windowRaw = slots.reduce((sum, slot) => sum + slotValue(slot), 0) / 3;
  let windowBonus = 0;
  if (validMonths >= 2) windowBonus += 0.15;
  if (monthsBelowFloor === 0 && candidateRates.some((rate) => rate != null)) windowBonus += 0.1;
  if (aggregateProjected3mRate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.aggregateThreshold) windowBonus += 0.15;

  const achievementWindowProximityScore = clamp01To100((windowRaw + windowBonus) * 100);

  const previewScore = clamp01To100(
    0.35 * currentMonthMomentumScore +
      0.25 * recentClosedMonthsScore +
      0.4 * achievementWindowProximityScore,
  );
  const roundedPreviewScore = Math.round(previewScore);

  const hasRecentClosedValidMonth = params.recentClosedMonths.some(
    (month) => month.completionRate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold,
  );
  const strong =
    roundedPreviewScore >= 80 &&
    params.projectedMonthEndRate >= DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.monthlyGoalThreshold &&
    (hasRecentClosedValidMonth || achievementWindowProximityScore >= 85);

  const status: PreviewAchievement['status'] =
    roundedPreviewScore < 50 || params.projectedMonthEndRate < DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.floorThreshold
      ? 'fragile'
      : strong
        ? 'strong'
        : 'building';

  const recentMonths: MonthRateInput[] = [
    {
      periodKey: params.periodKey,
      closed: false,
      completionRate: params.completionRateSoFar,
      projectedCompletionRate: params.projectedMonthEndRate,
      state: rateState(params.projectedMonthEndRate, true),
    },
    ...params.recentClosedMonths.slice(0, 3).map((month) => ({
      periodKey: month.periodKey,
      closed: true,
      completionRate: month.completionRate,
      projectedCompletionRate: null,
      state: rateState(month.completionRate, false),
    })),
  ];

  return {
    status,
    score: roundedPreviewScore,
    currentMonth: {
      periodKey: params.periodKey,
      completionRateSoFar: params.completionRateSoFar,
      projectedMonthEndRate: params.projectedMonthEndRate,
      expectedTargetSoFar: params.expectedTargetSoFar,
      completionsDoneSoFar: params.completionsDoneSoFar,
      expectedTargetMonthEnd: params.expectedTargetMonthEnd,
      projectedCompletionsMonthEnd: params.projectedCompletionsMonthEnd,
    },
    recentMonths,
    windowProximity: {
      slots,
      validMonths,
      monthsBelowFloor,
      aggregateProjected3mRate,
    },
    components: {
      currentMonthMomentumScore: Math.round(currentMonthMomentumScore),
      recentClosedMonthsScore: Math.round(recentClosedMonthsScore),
      achievementWindowProximityScore: Math.round(achievementWindowProximityScore),
    },
  };
}

export async function getTaskPreviewAchievement(params: {
  taskId: string;
  userId: string;
  today: Date;
}): Promise<PreviewAchievement> {
  const today = toDateOnly(params.today);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const monthStartText = monthStart.toISOString().slice(0, 10);
  const todayText = today.toISOString().slice(0, 10);
  const dayOfMonth = today.getUTCDate();
  const monthDays = daysInMonth(today);

  const [closedMonthsResult, completionResult, weeklyTargetResult] = await Promise.all([
    pool.query<ClosedMonthRow>(
      `SELECT period_end::text,
              completion_rate,
              expected_target,
              completions_done
         FROM task_difficulty_recalibrations
        WHERE task_id = $1::uuid
          AND source = ANY($2::text[])
        ORDER BY period_end DESC
        LIMIT 6`,
      [params.taskId, ['cron', 'admin_monthly_backfill']],
    ),
    pool.query<CompletionRow>(
      `SELECT COALESCE(SUM(quantity), 0) AS completed
         FROM daily_log
        WHERE task_id = $1::uuid
          AND user_id = $2::uuid
          AND date BETWEEN $3::date AND $4::date`,
      [params.taskId, params.userId, monthStartText, todayText],
    ),
    pool.query<WeeklyTargetRow>(
      `WITH selected_mode AS (
         SELECT h.game_mode_id
           FROM user_game_mode_history h
          WHERE h.user_id = $1::uuid
            AND h.effective_at <= ($2::date + interval '1 day' - interval '1 second')
          ORDER BY h.effective_at DESC
          LIMIT 1
       )
       SELECT COALESCE(sm_target.weekly_target, fallback_target.weekly_target) AS weekly_target
         FROM (SELECT 1) seed
    LEFT JOIN selected_mode sm ON TRUE
    LEFT JOIN cat_game_mode sm_target ON sm_target.game_mode_id = sm.game_mode_id
    LEFT JOIN users u ON u.user_id = $1::uuid
    LEFT JOIN cat_game_mode fallback_target ON fallback_target.game_mode_id = u.game_mode_id`,
      [params.userId, todayText],
    ),
  ]);

  const weeklyTarget = Number(weeklyTargetResult.rows[0]?.weekly_target ?? 0);
  const completionsDoneSoFar = Number(completionResult.rows[0]?.completed ?? 0);
  const expectedTargetSoFar = weeklyTarget > 0 ? (weeklyTarget * dayOfMonth) / 7 : 0;
  const expectedTargetMonthEnd = weeklyTarget > 0 ? (weeklyTarget * monthDays) / 7 : 0;
  const projectedCompletionsMonthEnd = dayOfMonth > 0 ? (completionsDoneSoFar / dayOfMonth) * monthDays : 0;

  const completionRateSoFar = expectedTargetSoFar > 0 ? completionsDoneSoFar / expectedTargetSoFar : 0;
  const projectedMonthEndRate = expectedTargetMonthEnd > 0 ? projectedCompletionsMonthEnd / expectedTargetMonthEnd : 0;

  const recentClosedMonths = closedMonthsResult.rows.map((row) => ({
    periodKey: asPeriodKey(row.period_end),
    completionRate: Number(row.completion_rate ?? 0),
    expectedTarget: Number(row.expected_target ?? 0),
    completionsDone: Number(row.completions_done ?? 0),
  }));

  return computePreviewAchievementFromRates({
    periodKey: monthStartText.slice(0, 7),
    completionRateSoFar,
    projectedMonthEndRate,
    expectedTargetSoFar,
    completionsDoneSoFar,
    expectedTargetMonthEnd,
    projectedCompletionsMonthEnd,
    recentClosedMonths,
  });
}
