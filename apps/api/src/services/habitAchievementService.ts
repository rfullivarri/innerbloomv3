import { pool } from '../db.js';
import { resolveLifecycleFlags, type TaskLifecycleStatus } from './habitAchievementLifecycle.js';
import { buildHabitAchievementFilter } from './taskLifecyclePolicy.js';

type RecalibrationPeriodRow = {
  period_end: string;
  expected_target: number | string;
  completions_done: number | string;
  completion_rate: number | string;
};

type PendingAchievementRow = {
  task_habit_achievement_id: string;
  task_id: string;
  user_id: string;
  pending_expires_at: string;
};

type LatestAchievementRow = {
  task_habit_achievement_id: string;
  status: 'pending_decision' | 'maintained' | 'stored' | 'expired_pending';
  pending_expires_at: string | null;
};

type HabitAchievementCandidateRow = {
  task_id: string;
  user_id: string;
};

export type HabitAchievementThresholds = {
  aggregateThreshold: number;
  monthlyGoalThreshold: number;
  minimumMonthsMeetingGoal: number;
  floorThreshold: number;
  windowMonths: number;
  pendingDays: number;
};

export const DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS: HabitAchievementThresholds = {
  aggregateThreshold: 0.8,
  monthlyGoalThreshold: 0.8,
  minimumMonthsMeetingGoal: 2,
  floorThreshold: 0.5,
  windowMonths: 3,
  pendingDays: 10,
};

export type HabitAchievementEvaluation = {
  qualifies: boolean;
  reason:
    | 'insufficient_periods'
    | 'non_consecutive_periods'
    | 'expected_target_zero'
    | 'aggregate_below_threshold'
    | 'insufficient_goal_months'
    | 'month_below_floor'
    | null;
  windowMonths: number;
  aggregatedExpectedTarget: number;
  aggregatedCompletionsDone: number;
  aggregatedCompletionRate: number;
  monthsEvaluated: number;
  monthsMeetingGoal: number;
  monthsBelowFloor: number;
  detectedPeriodEnd: string | null;
};

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function parseUtcDate(text: string): Date {
  return new Date(`${text.slice(0, 10)}T00:00:00.000Z`);
}

function isConsecutiveMonthlyWindow(periodEnds: string[]): boolean {
  for (let i = 0; i < periodEnds.length - 1; i += 1) {
    const current = parseUtcDate(periodEnds[i]);
    const next = parseUtcDate(periodEnds[i + 1]);
    const expectedPreviousMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 0));
    if (expectedPreviousMonth.toISOString().slice(0, 10) !== next.toISOString().slice(0, 10)) {
      return false;
    }
  }
  return true;
}

export function evaluateHabitAchievementWindow(
  periods: RecalibrationPeriodRow[],
  thresholds: Partial<HabitAchievementThresholds> = {},
): HabitAchievementEvaluation {
  const config = { ...DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS, ...thresholds };
  const sorted = [...periods].sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
  const window = sorted.slice(0, config.windowMonths);

  if (window.length < config.windowMonths) {
    return {
      qualifies: false,
      reason: 'insufficient_periods',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget: 0,
      aggregatedCompletionsDone: 0,
      aggregatedCompletionRate: 0,
      monthsEvaluated: window.length,
      monthsMeetingGoal: 0,
      monthsBelowFloor: 0,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  const periodEnds = window.map((row) => row.period_end);
  if (!isConsecutiveMonthlyWindow(periodEnds)) {
    return {
      qualifies: false,
      reason: 'non_consecutive_periods',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget: 0,
      aggregatedCompletionsDone: 0,
      aggregatedCompletionRate: 0,
      monthsEvaluated: window.length,
      monthsMeetingGoal: 0,
      monthsBelowFloor: 0,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  const aggregatedExpectedTarget = window.reduce((acc, row) => acc + Number(row.expected_target ?? 0), 0);
  const aggregatedCompletionsDone = window.reduce((acc, row) => acc + Number(row.completions_done ?? 0), 0);
  const aggregatedCompletionRate = aggregatedExpectedTarget > 0 ? aggregatedCompletionsDone / aggregatedExpectedTarget : 0;
  const monthsMeetingGoal = window.filter((row) => Number(row.completion_rate ?? 0) >= config.monthlyGoalThreshold).length;
  const monthsBelowFloor = window.filter((row) => Number(row.completion_rate ?? 0) < config.floorThreshold).length;

  if (aggregatedExpectedTarget <= 0) {
    return {
      qualifies: false,
      reason: 'expected_target_zero',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget,
      aggregatedCompletionsDone,
      aggregatedCompletionRate,
      monthsEvaluated: window.length,
      monthsMeetingGoal,
      monthsBelowFloor,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  if (monthsBelowFloor > 0) {
    return {
      qualifies: false,
      reason: 'month_below_floor',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget,
      aggregatedCompletionsDone,
      aggregatedCompletionRate,
      monthsEvaluated: window.length,
      monthsMeetingGoal,
      monthsBelowFloor,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  if (aggregatedCompletionRate < config.aggregateThreshold) {
    return {
      qualifies: false,
      reason: 'aggregate_below_threshold',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget,
      aggregatedCompletionsDone,
      aggregatedCompletionRate,
      monthsEvaluated: window.length,
      monthsMeetingGoal,
      monthsBelowFloor,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  if (monthsMeetingGoal < config.minimumMonthsMeetingGoal) {
    return {
      qualifies: false,
      reason: 'insufficient_goal_months',
      windowMonths: config.windowMonths,
      aggregatedExpectedTarget,
      aggregatedCompletionsDone,
      aggregatedCompletionRate,
      monthsEvaluated: window.length,
      monthsMeetingGoal,
      monthsBelowFloor,
      detectedPeriodEnd: window[0]?.period_end ?? null,
    };
  }

  return {
    qualifies: true,
    reason: null,
    windowMonths: config.windowMonths,
    aggregatedExpectedTarget,
    aggregatedCompletionsDone,
    aggregatedCompletionRate,
    monthsEvaluated: window.length,
    monthsMeetingGoal,
    monthsBelowFloor,
    detectedPeriodEnd: window[0]?.period_end ?? null,
  };
}

async function applyTaskLifecycle(taskId: string, status: TaskLifecycleStatus, pendingExpiresAt: Date | null): Promise<void> {
  const flags = resolveLifecycleFlags(status, pendingExpiresAt);
  await pool.query(
    `UPDATE tasks
        SET active = $2,
            lifecycle_status = $3,
            pending_expires_at = $4,
            excluded_from_growth_calibration = $5,
            excluded_from_mode_upgrade = $6,
            excluded_from_habit_achievement = $7,
            difficulty_locked = $8,
            achievement_seal_visible = $9,
            updated_at = NOW()
      WHERE task_id = $1::uuid`,
    [
      taskId,
      flags.active,
      flags.lifecycleStatus,
      flags.pendingExpiresAt ? flags.pendingExpiresAt.toISOString() : null,
      flags.excludedFromGrowthCalibration,
      flags.excludedFromModeUpgrade,
      flags.excludedFromHabitAchievement,
      flags.difficultyLocked,
      flags.achievementSealVisible,
    ],
  );
}

export async function evaluateTaskHabitAchievement(params: {
  taskId: string;
  thresholds?: Partial<HabitAchievementThresholds>;
}): Promise<HabitAchievementEvaluation> {
  const rowsResult = await pool.query<RecalibrationPeriodRow>(
    `SELECT period_end::text AS period_end,
            expected_target,
            completions_done,
            completion_rate
       FROM task_difficulty_recalibrations
      WHERE task_id = $1::uuid
        AND source = 'cron'
      ORDER BY period_end DESC
      LIMIT $2`,
    [params.taskId, (params.thresholds?.windowMonths ?? DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.windowMonths) + 1],
  );

  return evaluateHabitAchievementWindow(rowsResult.rows, params.thresholds);
}

export async function createPendingHabitAchievement(params: {
  taskId: string;
  userId: string;
  evaluation: HabitAchievementEvaluation;
  now?: Date;
  thresholds?: Partial<HabitAchievementThresholds>;
}): Promise<{ pendingExpiresAt: Date }> {
  if (!params.evaluation.qualifies || !params.evaluation.detectedPeriodEnd) {
    throw new Error('Task does not qualify for pending achievement');
  }

  const config = { ...DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS, ...params.thresholds };
  const now = params.now ?? new Date();
  const pendingExpiresAt = addDays(now, config.pendingDays);

  await pool.query('BEGIN');
  try {
    await pool.query(
      `INSERT INTO task_habit_achievements (
        task_id,
        user_id,
        status,
        detected_at,
        pending_expires_at,
        detected_period_end,
        window_months,
        aggregated_expected_target,
        aggregated_completions_done,
        aggregated_completion_rate,
        months_evaluated,
        months_meeting_goal,
        months_below_floor
      ) VALUES (
        $1::uuid,
        $2::uuid,
        'pending_decision',
        $3::timestamptz,
        $4::timestamptz,
        $5::date,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )`,
      [
        params.taskId,
        params.userId,
        now.toISOString(),
        pendingExpiresAt.toISOString(),
        params.evaluation.detectedPeriodEnd,
        params.evaluation.windowMonths,
        params.evaluation.aggregatedExpectedTarget,
        params.evaluation.aggregatedCompletionsDone,
        params.evaluation.aggregatedCompletionRate,
        params.evaluation.monthsEvaluated,
        params.evaluation.monthsMeetingGoal,
        params.evaluation.monthsBelowFloor,
      ],
    );

    await applyTaskLifecycle(params.taskId, 'achievement_pending', pendingExpiresAt);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  return { pendingExpiresAt };
}

export async function resolveExpiredPendingHabitAchievements(now: Date = new Date()): Promise<number> {
  const expiredResult = await pool.query<PendingAchievementRow>(
    `SELECT task_habit_achievement_id, task_id, user_id, pending_expires_at::text AS pending_expires_at
       FROM task_habit_achievements
      WHERE status = 'pending_decision'
        AND pending_expires_at <= $1::timestamptz`,
    [now.toISOString()],
  );

  if (expiredResult.rows.length === 0) {
    return 0;
  }

  await pool.query('BEGIN');
  try {
    for (const row of expiredResult.rows) {
      await pool.query(
        `UPDATE task_habit_achievements
            SET status = 'expired_pending',
                updated_at = NOW()
          WHERE task_habit_achievement_id = $1::uuid`,
        [row.task_habit_achievement_id],
      );

      await applyTaskLifecycle(row.task_id, 'active', null);
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  return expiredResult.rows.length;
}

async function getLatestAchievement(taskId: string, userId: string): Promise<LatestAchievementRow | null> {
  const result = await pool.query<LatestAchievementRow>(
    `SELECT task_habit_achievement_id,
            status,
            pending_expires_at::text AS pending_expires_at
       FROM task_habit_achievements
      WHERE task_id = $1::uuid
        AND user_id = $2::uuid
      ORDER BY detected_at DESC
      LIMIT 1`,
    [taskId, userId],
  );

  return result.rows[0] ?? null;
}

export async function applyHabitAchievementDecision(params: {
  taskId: string;
  userId: string;
  decision: 'maintain' | 'store';
  now?: Date;
}): Promise<void> {
  const now = params.now ?? new Date();
  const latest = await getLatestAchievement(params.taskId, params.userId);

  if (!latest || latest.status !== 'pending_decision') {
    throw new Error('No pending achievement decision found');
  }

  if (latest.pending_expires_at && new Date(latest.pending_expires_at).getTime() <= now.getTime()) {
    throw new Error('Pending achievement is expired');
  }

  const nextStatus = params.decision === 'maintain' ? 'maintained' : 'stored';
  const lifecycle: TaskLifecycleStatus = params.decision === 'maintain' ? 'achievement_maintained' : 'achievement_stored';

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE task_habit_achievements
          SET status = $2,
              decision_made_at = $3::timestamptz,
              updated_at = NOW()
        WHERE task_habit_achievement_id = $1::uuid`,
      [latest.task_habit_achievement_id, nextStatus, now.toISOString()],
    );

    await applyTaskLifecycle(params.taskId, lifecycle, null);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

export async function toggleAchievedHabitTracking(params: {
  taskId: string;
  userId: string;
  maintainEnabled: boolean;
}): Promise<void> {
  const latest = await getLatestAchievement(params.taskId, params.userId);
  if (!latest || (latest.status !== 'maintained' && latest.status !== 'stored')) {
    throw new Error('No achieved habit record available to toggle');
  }

  const nextStatus = params.maintainEnabled ? 'maintained' : 'stored';
  const lifecycle: TaskLifecycleStatus = params.maintainEnabled ? 'achievement_maintained' : 'achievement_stored';

  await pool.query('BEGIN');
  try {
    await pool.query(
      `UPDATE task_habit_achievements
          SET status = $2,
              updated_at = NOW()
        WHERE task_habit_achievement_id = $1::uuid`,
      [latest.task_habit_achievement_id, nextStatus],
    );

    await applyTaskLifecycle(params.taskId, lifecycle, null);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

export type MonthlyHabitAchievementRun = {
  expiredResolved: number;
  evaluated: number;
  pendingCreated: number;
};

export async function runMonthlyHabitAchievementDetection(params: {
  periodStart: string;
  nextPeriodStart: string;
  now?: Date;
  userId?: string;
}): Promise<MonthlyHabitAchievementRun> {
  const now = params.now ?? new Date();
  const expiredResolved = await resolveExpiredPendingHabitAchievements(now);

  const candidateResult = await pool.query<HabitAchievementCandidateRow>(
    `SELECT DISTINCT r.task_id, r.user_id
       FROM task_difficulty_recalibrations r
       JOIN tasks t ON t.task_id = r.task_id
      WHERE r.source = 'cron'
        AND r.period_end >= $1::date
        AND r.period_end < $2::date
        AND ${buildHabitAchievementFilter('t')}
        AND ($3::uuid IS NULL OR r.user_id = $3::uuid)`,
    [params.periodStart, params.nextPeriodStart, params.userId ?? null],
  );

  let evaluated = 0;
  let pendingCreated = 0;

  for (const row of candidateResult.rows) {
    const latest = await getLatestAchievement(row.task_id, row.user_id);
    if (latest && latest.status !== 'expired_pending') {
      continue;
    }

    const evaluation = await evaluateTaskHabitAchievement({ taskId: row.task_id });
    evaluated += 1;
    if (!evaluation.qualifies) {
      continue;
    }

    await createPendingHabitAchievement({
      taskId: row.task_id,
      userId: row.user_id,
      evaluation,
      now,
    });
    pendingCreated += 1;
  }

  return { expiredResolved, evaluated, pendingCreated };
}
