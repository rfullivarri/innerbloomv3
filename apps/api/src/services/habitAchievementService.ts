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

type RewardsHabitRow = {
  task_habit_achievement_id: string;
  task_id: string;
  status: 'maintained' | 'stored';
  detected_at: string;
  decision_made_at: string | null;
  gp_generated_until_achievement: number | string | null;
  gp_generated_since_maintain: number | string | null;
  task_name: string | null;
  pillar_id: number | string | null;
  pillar_code: string | null;
  pillar_name: string | null;
  trait_id: number | string | null;
  trait_code: string | null;
  trait_name: string | null;
  achievement_seal_visible: boolean | null;
};

type PendingCountRow = {
  pending_count: number | string;
};

type TaskAchievementStateRow = {
  task_id: string;
  task_name: string;
  lifecycle_status: TaskLifecycleStatus;
  pending_expires_at: string | null;
  achievement_seal_visible: boolean;
  pillar_id: number | string | null;
  pillar_code: string | null;
  pillar_name: string | null;
  trait_id: number | string | null;
  trait_code: string | null;
  trait_name: string | null;
  task_habit_achievement_id: string | null;
  achievement_status: 'pending_decision' | 'maintained' | 'stored' | 'expired_pending' | null;
  detected_at: string | null;
  decision_made_at: string | null;
  pending_expires_at_record: string | null;
  gp_generated_until_achievement: number | string | null;
  gp_generated_since_maintain: number | string | null;
};

export type HabitAchievementShelfItem = {
  id: string;
  task_id: string;
  task_name: string;
  status: 'maintained' | 'stored';
  achieved_at: string;
  decision_made_at: string | null;
  gp_before_achievement: number;
  gp_since_maintain: number;
  maintain_enabled: boolean;
  pillar: { id: number | null; code: string | null; name: string | null };
  trait: { id: number | null; code: string | null; name: string | null };
  seal: { visible: boolean };
};

export type HabitAchievementShelfGroup = {
  pillar: { id: number | null; code: string | null; name: string | null };
  habits: HabitAchievementShelfItem[];
};

export type TaskHabitAchievementState = {
  task: {
    id: string;
    name: string;
    lifecycle_status: TaskLifecycleStatus;
    pending_expires_at: string | null;
    achievement_seal_visible: boolean;
    pillar: { id: number | null; code: string | null; name: string | null };
    trait: { id: number | null; code: string | null; name: string | null };
  };
  achievement: {
    exists: boolean;
    id: string | null;
    status: 'not_achieved' | 'pending_decision' | 'maintained' | 'stored' | 'expired_pending';
    achieved_at: string | null;
    decision_made_at: string | null;
    pending_expires_at: string | null;
    gp_before_achievement: number;
    gp_since_maintain: number;
    maintain_enabled: boolean;
  };
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

export async function getUserRewardsHabitAchievementsByPillar(userId: string): Promise<HabitAchievementShelfGroup[]> {
  const result = await pool.query<RewardsHabitRow>(
    `WITH latest AS (
       SELECT DISTINCT ON (ha.task_id)
              ha.task_habit_achievement_id,
              ha.task_id,
              ha.status,
              ha.detected_at::text,
              ha.decision_made_at::text,
              ha.gp_generated_until_achievement,
              ha.gp_generated_since_maintain
         FROM task_habit_achievements ha
        WHERE ha.user_id = $1::uuid
          AND ha.status IN ('maintained', 'stored')
        ORDER BY ha.task_id, ha.detected_at DESC
     )
     SELECT latest.task_habit_achievement_id,
            latest.task_id,
            latest.status,
            latest.detected_at,
            latest.decision_made_at,
            latest.gp_generated_until_achievement,
            latest.gp_generated_since_maintain,
            t.task AS task_name,
            cp.pillar_id,
            cp.code AS pillar_code,
            cp.name AS pillar_name,
            ct.trait_id,
            ct.code AS trait_code,
            ct.name AS trait_name,
            t.achievement_seal_visible
       FROM latest
       JOIN tasks t ON t.task_id = latest.task_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
      ORDER BY cp.code NULLS LAST, t.task ASC`,
    [userId],
  );

  const grouped = new Map<string, HabitAchievementShelfGroup>();

  for (const row of result.rows) {
    const pillarId = row.pillar_id === null ? null : Number(row.pillar_id);
    const groupKey = String(pillarId ?? row.pillar_code ?? 'none');

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        pillar: {
          id: pillarId,
          code: row.pillar_code,
          name: row.pillar_name,
        },
        habits: [],
      });
    }

    grouped.get(groupKey)?.habits.push({
      id: row.task_habit_achievement_id,
      task_id: row.task_id,
      task_name: row.task_name ?? 'Task',
      status: row.status,
      achieved_at: row.detected_at,
      decision_made_at: row.decision_made_at,
      gp_before_achievement: Number(row.gp_generated_until_achievement ?? 0),
      gp_since_maintain: Number(row.gp_generated_since_maintain ?? 0),
      maintain_enabled: row.status === 'maintained',
      pillar: {
        id: pillarId,
        code: row.pillar_code,
        name: row.pillar_name,
      },
      trait: {
        id: row.trait_id === null ? null : Number(row.trait_id),
        code: row.trait_code,
        name: row.trait_name,
      },
      seal: { visible: Boolean(row.achievement_seal_visible) },
    });
  }

  return Array.from(grouped.values());
}

export async function getUserPendingHabitAchievementCount(userId: string, now: Date = new Date()): Promise<number> {
  const result = await pool.query<PendingCountRow>(
    `SELECT COUNT(*)::int AS pending_count
       FROM task_habit_achievements
      WHERE user_id = $1::uuid
        AND status = 'pending_decision'
        AND pending_expires_at > $2::timestamptz`,
    [userId, now.toISOString()],
  );
  return Number(result.rows[0]?.pending_count ?? 0);
}

export async function getTaskHabitAchievementState(taskId: string, userId: string): Promise<TaskHabitAchievementState | null> {
  const result = await pool.query<TaskAchievementStateRow>(
    `SELECT t.task_id,
            t.task AS task_name,
            t.lifecycle_status,
            t.pending_expires_at::text,
            t.achievement_seal_visible,
            cp.pillar_id,
            cp.code AS pillar_code,
            cp.name AS pillar_name,
            ct.trait_id,
            ct.code AS trait_code,
            ct.name AS trait_name,
            ha.task_habit_achievement_id,
            ha.status AS achievement_status,
            ha.detected_at::text,
            ha.decision_made_at::text,
            ha.pending_expires_at::text AS pending_expires_at_record,
            ha.gp_generated_until_achievement,
            ha.gp_generated_since_maintain
       FROM tasks t
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN LATERAL (
            SELECT task_habit_achievement_id,
                   status,
                   detected_at,
                   decision_made_at,
                   pending_expires_at,
                   gp_generated_until_achievement,
                   gp_generated_since_maintain
              FROM task_habit_achievements
             WHERE task_id = t.task_id
             ORDER BY detected_at DESC
             LIMIT 1
            ) ha ON TRUE
      WHERE t.task_id = $1::uuid
        AND t.user_id = $2::uuid
      LIMIT 1`,
    [taskId, userId],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const status = row.achievement_status ?? 'not_achieved';
  return {
    task: {
      id: row.task_id,
      name: row.task_name,
      lifecycle_status: row.lifecycle_status,
      pending_expires_at: row.pending_expires_at,
      achievement_seal_visible: row.achievement_seal_visible,
      pillar: {
        id: row.pillar_id === null ? null : Number(row.pillar_id),
        code: row.pillar_code,
        name: row.pillar_name,
      },
      trait: {
        id: row.trait_id === null ? null : Number(row.trait_id),
        code: row.trait_code,
        name: row.trait_name,
      },
    },
    achievement: {
      exists: row.task_habit_achievement_id !== null,
      id: row.task_habit_achievement_id,
      status,
      achieved_at: row.detected_at,
      decision_made_at: row.decision_made_at,
      pending_expires_at: row.pending_expires_at_record,
      gp_before_achievement: Number(row.gp_generated_until_achievement ?? 0),
      gp_since_maintain: Number(row.gp_generated_since_maintain ?? 0),
      maintain_enabled: status === 'maintained',
    },
  };
}

export type MonthlyHabitAchievementRun = {
  expiredResolved: number;
  evaluated: number;
  pendingCreated: number;
};

export type RetroactiveHabitAchievementRun = {
  scope: 'single_user' | 'all_users';
  userId: string | null;
  expiredResolved: number;
  evaluated: number;
  qualified: number;
  pendingCreated: number;
  skipped: number;
  ignored: number;
  errors: number;
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

export async function runRetroactiveHabitAchievementDetection(params: {
  now?: Date;
  userId?: string;
}): Promise<RetroactiveHabitAchievementRun> {
  const now = params.now ?? new Date();
  const expiredResolved = await resolveExpiredPendingHabitAchievements(now);

  const candidateResult = await pool.query<HabitAchievementCandidateRow>(
    `SELECT DISTINCT r.task_id, r.user_id
       FROM task_difficulty_recalibrations r
       JOIN tasks t ON t.task_id = r.task_id
      WHERE r.source = 'cron'
        AND ${buildHabitAchievementFilter('t')}
        AND ($1::uuid IS NULL OR r.user_id = $1::uuid)`,
    [params.userId ?? null],
  );

  let evaluated = 0;
  let qualified = 0;
  let pendingCreated = 0;
  let skipped = 0;
  let ignored = 0;
  let errors = 0;

  for (const row of candidateResult.rows) {
    try {
      const latest = await getLatestAchievement(row.task_id, row.user_id);
      if (latest && latest.status !== 'expired_pending') {
        skipped += 1;
        continue;
      }

      const evaluation = await evaluateTaskHabitAchievement({ taskId: row.task_id });
      evaluated += 1;
      if (!evaluation.qualifies) {
        ignored += 1;
        continue;
      }

      qualified += 1;
      await createPendingHabitAchievement({
        taskId: row.task_id,
        userId: row.user_id,
        evaluation,
        now,
      });
      pendingCreated += 1;
    } catch {
      errors += 1;
    }
  }

  return {
    scope: params.userId ? 'single_user' : 'all_users',
    userId: params.userId ?? null,
    expiredResolved,
    evaluated,
    qualified,
    pendingCreated,
    skipped,
    ignored,
    errors,
  };
}
