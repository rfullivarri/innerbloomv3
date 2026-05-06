import { pool } from '../db.js';
import { resolveLifecycleFlags, type TaskLifecycleStatus } from './habitAchievementLifecycle.js';
import { buildHabitAchievementFilter } from './taskLifecyclePolicy.js';
import { runMonthlyTaskDifficultyCalibrationBackfill } from './taskDifficultyCalibrationService.js';

type RecalibrationPeriodRow = {
  period_end: string;
  expected_target: number | string;
  completions_done: number | string;
  completion_rate: number | string;
  source?: HabitAchievementSource;
};

type GpSnapshotRow = {
  gp_total: number | string | null;
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

type RetroactiveHabitAchievementCandidateRow = HabitAchievementCandidateRow & {
  has_allowed_source_history: boolean;
  current_active: boolean | null;
  current_excluded_from_habit_achievement: boolean | null;
};

type HabitAchievementSource = 'cron' | 'admin_run' | 'admin_monthly_backfill';

const CANONICAL_HABIT_ACHIEVEMENT_SOURCES: readonly HabitAchievementSource[] = ['cron', 'admin_monthly_backfill'];
const MONTHLY_HABIT_ACHIEVEMENT_SOURCES: readonly HabitAchievementSource[] = CANONICAL_HABIT_ACHIEVEMENT_SOURCES;
const RETROACTIVE_HABIT_ACHIEVEMENT_SOURCES: readonly HabitAchievementSource[] = CANONICAL_HABIT_ACHIEVEMENT_SOURCES;

type RewardsHabitRow = {
  task_id: string;
  task_name: string | null;
  pillar_id: number | string | null;
  pillar_code: string | null;
  pillar_name: string | null;
  trait_id: number | string | null;
  trait_code: string | null;
  trait_name: string | null;
  achievement_seal_visible: boolean | null;
  task_habit_achievement_id: string | null;
  status: 'pending_decision' | 'maintained' | 'stored' | null;
  detected_at: string | null;
  decision_made_at: string | null;
  gp_generated_until_achievement: number | string | null;
  gp_generated_since_maintain: number | string | null;
};

type PendingCountRow = {
  pending_count: number | string;
};

export type HabitAchievementTaskOutcome = {
  taskId: string;
  userId: string;
  outcome: 'skipped_existing_record' | 'ignored_not_qualified' | 'qualified_pending_created' | 'error';
  reason: HabitAchievementEvaluation['reason'] | 'already_has_active_achievement_record' | 'create_pending_failed' | 'evaluation_failed' | null;
  detectedPeriodEnd: string | null;
  monthsEvaluated: number | null;
  sources: HabitAchievementSource[];
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
  status: 'not_achieved' | 'pending_decision' | 'maintained' | 'stored';
  achieved_at: string | null;
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

async function getTaskGpTotalUntilDate(params: { taskId: string; userId: string; until: Date }): Promise<number> {
  const result = await pool.query<GpSnapshotRow>(
    `SELECT COALESCE(SUM(COALESCE(t.xp_base, cd.xp_base, 0) * GREATEST(dl.quantity, 1)), 0)::int AS gp_total
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE dl.user_id = $1::uuid
        AND dl.task_id = $2::uuid
        AND dl.date <= $3::date`,
    [params.userId, params.taskId, params.until.toISOString()],
  );

  return Number(result.rows[0]?.gp_total ?? 0);
}

async function backfillMissingGpSnapshotsForUser(userId: string): Promise<void> {
  await pool.query(
    `WITH missing AS (
       SELECT ha.task_habit_achievement_id,
              COALESCE(SUM(COALESCE(t.xp_base, cd.xp_base, 0) * GREATEST(dl.quantity, 1)), 0)::int AS gp_total
         FROM task_habit_achievements ha
         JOIN tasks t ON t.task_id = ha.task_id
    LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
    LEFT JOIN daily_log dl
           ON dl.user_id = ha.user_id
          AND dl.task_id = ha.task_id
          AND dl.date <= ha.detected_at::date
        WHERE ha.user_id = $1::uuid
          AND COALESCE(ha.gp_generated_until_achievement, 0) = 0
        GROUP BY ha.task_habit_achievement_id
     )
     UPDATE task_habit_achievements ha
        SET gp_generated_until_achievement = missing.gp_total,
            updated_at = NOW()
       FROM missing
      WHERE ha.task_habit_achievement_id = missing.task_habit_achievement_id`,
    [userId],
  );
}

export async function evaluateTaskHabitAchievement(params: {
  taskId: string;
  allowedSources?: readonly HabitAchievementSource[];
  thresholds?: Partial<HabitAchievementThresholds>;
}): Promise<HabitAchievementEvaluation> {
  const allowedSources = params.allowedSources ?? MONTHLY_HABIT_ACHIEVEMENT_SOURCES;
  const rowsResult = await pool.query<RecalibrationPeriodRow>(
    `SELECT ranked.period_end::text AS period_end,
            ranked.expected_target,
            ranked.completions_done,
            ranked.completion_rate,
            ranked.source
       FROM (
         SELECT r.period_end,
                r.expected_target,
                r.completions_done,
                r.completion_rate,
                r.source,
                ROW_NUMBER() OVER (
                  PARTITION BY r.period_end
                  ORDER BY CASE r.source WHEN 'cron' THEN 1 WHEN 'admin_monthly_backfill' THEN 2 ELSE 3 END ASC,
                           r.analyzed_at DESC
                ) AS rn
           FROM task_difficulty_recalibrations r
          WHERE r.task_id = $1::uuid
            AND r.source = ANY($3::text[])
       ) ranked
      WHERE ranked.rn = 1
      ORDER BY ranked.period_end DESC
      LIMIT $2`,
    [
      params.taskId,
      (params.thresholds?.windowMonths ?? DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS.windowMonths) + 1,
      [...allowedSources],
    ],
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
  const gpGeneratedUntilAchievement = await getTaskGpTotalUntilDate({
    taskId: params.taskId,
    userId: params.userId,
    until: now,
  });

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
        months_below_floor,
        gp_generated_until_achievement
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
        $12,
        $13
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
        gpGeneratedUntilAchievement,
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

export async function getUserRewardsHabitAchievementsByPillar(userId: string, now: Date = new Date()): Promise<HabitAchievementShelfGroup[]> {
  await backfillMissingGpSnapshotsForUser(userId);
  const result = await pool.query<RewardsHabitRow>(
    `SELECT t.task_id,
            t.task AS task_name,
            cp.pillar_id,
            cp.code AS pillar_code,
            cp.name AS pillar_name,
            ct.trait_id,
            ct.code AS trait_code,
            ct.name AS trait_name,
            t.achievement_seal_visible,
            ha.task_habit_achievement_id,
            ha.status,
            ha.detected_at::text,
            ha.decision_made_at::text,
            ha.gp_generated_until_achievement,
            ha.gp_generated_since_maintain
       FROM tasks t
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN LATERAL (
            SELECT latest.task_habit_achievement_id,
                   latest.status,
                   latest.detected_at,
                   latest.decision_made_at,
                   latest.gp_generated_until_achievement,
                   latest.gp_generated_since_maintain
              FROM task_habit_achievements latest
             WHERE latest.task_id = t.task_id
               AND (
                 latest.status IN ('maintained', 'stored')
                 OR (latest.status = 'pending_decision' AND latest.pending_expires_at > $2::timestamptz)
               )
             ORDER BY latest.detected_at DESC
             LIMIT 1
            ) ha ON TRUE
      WHERE t.user_id = $1::uuid
        AND (
          t.active = TRUE
          OR t.lifecycle_status IN ('achievement_pending', 'achievement_maintained', 'achievement_stored')
        )
      ORDER BY cp.code NULLS LAST, t.created_at ASC, t.task ASC`,
    [userId, now.toISOString()],
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
      id: row.task_habit_achievement_id ?? `task-${row.task_id}`,
      task_id: row.task_id,
      task_name: row.task_name ?? 'Task',
      status: row.status ?? 'not_achieved',
      achieved_at: row.detected_at ?? null,
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
  await backfillMissingGpSnapshotsForUser(userId);
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
  qualified: number;
  pendingCreated: number;
  skipped: number;
  ignored: number;
  errors: number;
  outcomes: HabitAchievementTaskOutcome[];
};

export type RetroactiveHabitAchievementRun = {
  scope: 'single_user' | 'all_users';
  userId: string | null;
  backfill: {
    tasksConsidered: number;
    periodsInserted: number;
    periodsSkippedExisting: number;
    periodsSkippedMissingTarget: number;
  };
  expiredResolved: number;
  rawHistoricalCandidates: number;
  droppedBySource: number;
  droppedByLifecycleCurrentState: number;
  candidatesConsidered: number;
  evaluated: number;
  qualified: number;
  pendingCreated: number;
  skipped: number;
  ignored: number;
  errors: number;
  outcomes: HabitAchievementTaskOutcome[];
};

export type HabitAchievementDiagnosticsRow = {
  taskId: string;
  taskName: string;
  qualifiesOverall: boolean;
  consecutiveWindowPass: boolean;
  aggregateCompletionRate: number;
  monthsMeetingGoal: number;
  minimumMonthsMeetingGoal: number;
  twoOfThreeMonthsPass: boolean;
  anyMonthBelowFloor: boolean;
  monthsEvaluated: number;
  windowMonths: number;
  dominantReason:
    | HabitAchievementEvaluation['reason']
    | 'already_has_active_achievement_record'
    | 'qualifies';
  detectedPeriodEnd: string | null;
  latestAchievementStatus: LatestAchievementRow['status'] | null;
};

export type HabitAchievementDiagnosticsReport = {
  userId: string;
  generatedAt: string;
  thresholds: HabitAchievementThresholds;
  rows: HabitAchievementDiagnosticsRow[];
};

export async function runMonthlyHabitAchievementDetection(params: {
  periodStart: string;
  nextPeriodStart: string;
  now?: Date;
  userId?: string;
}): Promise<MonthlyHabitAchievementRun> {
  const now = params.now ?? new Date();
  const expiredResolved = await resolveExpiredPendingHabitAchievements(now);
  const sources = [...MONTHLY_HABIT_ACHIEVEMENT_SOURCES];

  const candidateResult = await pool.query<HabitAchievementCandidateRow>(
    `SELECT DISTINCT r.task_id, r.user_id
       FROM task_difficulty_recalibrations r
       JOIN tasks t ON t.task_id = r.task_id
      WHERE r.source = ANY($4::text[])
        AND r.period_end >= $1::date
        AND r.period_end < $2::date
        AND ${buildHabitAchievementFilter('t')}
        AND ($3::uuid IS NULL OR r.user_id = $3::uuid)`,
    [params.periodStart, params.nextPeriodStart, params.userId ?? null, sources],
  );

  let evaluated = 0;
  let qualified = 0;
  let pendingCreated = 0;
  let skipped = 0;
  let ignored = 0;
  let errors = 0;
  const outcomes: HabitAchievementTaskOutcome[] = [];

  for (const row of candidateResult.rows) {
    try {
      const latest = await getLatestAchievement(row.task_id, row.user_id);
      if (latest && latest.status !== 'expired_pending') {
        skipped += 1;
        outcomes.push({
          taskId: row.task_id,
          userId: row.user_id,
          outcome: 'skipped_existing_record',
          reason: 'already_has_active_achievement_record',
          detectedPeriodEnd: null,
          monthsEvaluated: null,
          sources,
        });
        continue;
      }

      const evaluation = await evaluateTaskHabitAchievement({ taskId: row.task_id, allowedSources: sources });
      evaluated += 1;
      if (!evaluation.qualifies) {
        ignored += 1;
        outcomes.push({
          taskId: row.task_id,
          userId: row.user_id,
          outcome: 'ignored_not_qualified',
          reason: evaluation.reason,
          detectedPeriodEnd: evaluation.detectedPeriodEnd,
          monthsEvaluated: evaluation.monthsEvaluated,
          sources,
        });
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
      outcomes.push({
        taskId: row.task_id,
        userId: row.user_id,
        outcome: 'qualified_pending_created',
        reason: null,
        detectedPeriodEnd: evaluation.detectedPeriodEnd,
        monthsEvaluated: evaluation.monthsEvaluated,
        sources,
      });
    } catch (error) {
      errors += 1;
      const reason = error instanceof Error ? error.message : 'unknown_error';
      console.error('[habit-achievement] monthly task evaluation failed', {
        taskId: row.task_id,
        userId: row.user_id,
        periodStart: params.periodStart,
        nextPeriodStart: params.nextPeriodStart,
        reason,
      });
      outcomes.push({
        taskId: row.task_id,
        userId: row.user_id,
        outcome: 'error',
        reason: 'evaluation_failed',
        detectedPeriodEnd: null,
        monthsEvaluated: null,
        sources,
      });
    }
  }

  console.info('[habit-achievement] monthly detection completed', {
    periodStart: params.periodStart,
    nextPeriodStart: params.nextPeriodStart,
    userId: params.userId ?? null,
    sources,
    candidates: candidateResult.rows.length,
    evaluated,
    qualified,
    pendingCreated,
    skipped,
    ignored,
    errors,
  });

  return { expiredResolved, evaluated, qualified, pendingCreated, skipped, ignored, errors, outcomes };
}

export async function runRetroactiveHabitAchievementDetection(params: {
  now?: Date;
  userId?: string;
}): Promise<RetroactiveHabitAchievementRun> {
  const now = params.now ?? new Date();
  const backfill = await runMonthlyTaskDifficultyCalibrationBackfill({ userId: params.userId, now });
  const expiredResolved = await resolveExpiredPendingHabitAchievements(now);

  const candidateResult = await pool.query<RetroactiveHabitAchievementCandidateRow>(
    `WITH raw_candidates AS (
       SELECT DISTINCT r.task_id, r.user_id
         FROM task_difficulty_recalibrations r
        WHERE ($1::uuid IS NULL OR r.user_id = $1::uuid)
     )
     SELECT rc.task_id,
            rc.user_id,
            EXISTS (
              SELECT 1
                FROM task_difficulty_recalibrations rs
               WHERE rs.task_id = rc.task_id
                 AND rs.user_id = rc.user_id
                 AND rs.source = ANY($2::text[])
            ) AS has_allowed_source_history,
            t.active AS current_active,
            t.excluded_from_habit_achievement AS current_excluded_from_habit_achievement
       FROM raw_candidates rc
  LEFT JOIN tasks t ON t.task_id = rc.task_id`,
    [params.userId ?? null, [...RETROACTIVE_HABIT_ACHIEVEMENT_SOURCES]],
  );

  const rawHistoricalCandidates = candidateResult.rows.length;
  const droppedBySource = candidateResult.rows.filter((row) => !row.has_allowed_source_history).length;
  const droppedByLifecycleCurrentState = candidateResult.rows.filter(
    (row) => row.current_active !== true || row.current_excluded_from_habit_achievement === true,
  ).length;
  const candidates = candidateResult.rows.filter((row) => row.has_allowed_source_history);

  let evaluated = 0;
  let qualified = 0;
  let pendingCreated = 0;
  let skipped = 0;
  let ignored = 0;
  let errors = 0;
  const sources = [...RETROACTIVE_HABIT_ACHIEVEMENT_SOURCES];
  const outcomes: HabitAchievementTaskOutcome[] = [];

  for (const row of candidates) {
    try {
      const latest = await getLatestAchievement(row.task_id, row.user_id);
      if (latest && latest.status !== 'expired_pending') {
        skipped += 1;
        outcomes.push({
          taskId: row.task_id,
          userId: row.user_id,
          outcome: 'skipped_existing_record',
          reason: 'already_has_active_achievement_record',
          detectedPeriodEnd: null,
          monthsEvaluated: null,
          sources,
        });
        continue;
      }

      const evaluation = await evaluateTaskHabitAchievement({
        taskId: row.task_id,
        allowedSources: sources,
      });
      evaluated += 1;
      if (!evaluation.qualifies) {
        ignored += 1;
        outcomes.push({
          taskId: row.task_id,
          userId: row.user_id,
          outcome: 'ignored_not_qualified',
          reason: evaluation.reason,
          detectedPeriodEnd: evaluation.detectedPeriodEnd,
          monthsEvaluated: evaluation.monthsEvaluated,
          sources,
        });
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
      outcomes.push({
        taskId: row.task_id,
        userId: row.user_id,
        outcome: 'qualified_pending_created',
        reason: null,
        detectedPeriodEnd: evaluation.detectedPeriodEnd,
        monthsEvaluated: evaluation.monthsEvaluated,
        sources,
      });
    } catch (error) {
      errors += 1;
      const reason = error instanceof Error ? error.message : 'unknown_error';
      console.error('[habit-achievement] retroactive task evaluation failed', {
        taskId: row.task_id,
        userId: row.user_id,
        reason,
      });
      outcomes.push({
        taskId: row.task_id,
        userId: row.user_id,
        outcome: 'error',
        reason: 'evaluation_failed',
        detectedPeriodEnd: null,
        monthsEvaluated: null,
        sources,
      });
    }
  }

  console.info('[habit-achievement] retroactive detection completed', {
    scope: params.userId ? 'single_user' : 'all_users',
    userId: params.userId ?? null,
    sources,
    rawHistoricalCandidates,
    candidatesConsidered: candidates.length,
    evaluated,
    qualified,
    pendingCreated,
    skipped,
    ignored,
    errors,
  });

  return {
    scope: params.userId ? 'single_user' : 'all_users',
    userId: params.userId ?? null,
    backfill: {
      tasksConsidered: backfill.tasksConsidered,
      periodsInserted: backfill.periodsInserted,
      periodsSkippedExisting: backfill.periodsSkippedExisting,
      periodsSkippedMissingTarget: backfill.periodsSkippedMissingTarget,
    },
    expiredResolved,
    rawHistoricalCandidates,
    droppedBySource,
    droppedByLifecycleCurrentState,
    candidatesConsidered: candidates.length,
    evaluated,
    qualified,
    pendingCreated,
    skipped,
    ignored,
    errors,
    outcomes,
  };
}

export async function getUserRetroactiveHabitAchievementDiagnostics(params: {
  userId: string;
  thresholds?: Partial<HabitAchievementThresholds>;
}): Promise<HabitAchievementDiagnosticsReport> {
  const config = { ...DEFAULT_HABIT_ACHIEVEMENT_THRESHOLDS, ...params.thresholds };
  const maxPeriods = config.windowMonths + 1;

  const taskResult = await pool.query<{ task_id: string; task_name: string }>(
    `SELECT DISTINCT r.task_id,
            COALESCE(t.task, '(task deleted)') AS task_name
       FROM task_difficulty_recalibrations r
  LEFT JOIN tasks t ON t.task_id = r.task_id
      WHERE r.user_id = $1::uuid
        AND r.source = ANY($2::text[])
      ORDER BY task_name ASC`,
    [params.userId, [...RETROACTIVE_HABIT_ACHIEVEMENT_SOURCES]],
  );

  const taskIds = taskResult.rows.map((row) => row.task_id);
  if (taskIds.length === 0) {
    return {
      userId: params.userId,
      generatedAt: new Date().toISOString(),
      thresholds: config,
      rows: [],
    };
  }

  const periodRows = await pool.query<
    RecalibrationPeriodRow & {
      task_id: string;
    }
  >(
    `SELECT limited.task_id,
            limited.period_end::text AS period_end,
            limited.expected_target,
            limited.completions_done,
            limited.completion_rate,
            limited.source
       FROM (
         SELECT deduped.*,
                ROW_NUMBER() OVER (PARTITION BY deduped.task_id ORDER BY deduped.period_end DESC) AS task_rn
           FROM (
             SELECT r.task_id,
                    r.period_end,
                    r.expected_target,
                    r.completions_done,
                    r.completion_rate,
                    r.source,
                    ROW_NUMBER() OVER (
                      PARTITION BY r.task_id, r.period_end
                      ORDER BY CASE r.source WHEN 'cron' THEN 1 WHEN 'admin_monthly_backfill' THEN 2 ELSE 3 END ASC,
                               r.analyzed_at DESC
                    ) AS period_rn
               FROM task_difficulty_recalibrations r
              WHERE r.user_id = $1::uuid
                AND r.task_id = ANY($2::uuid[])
                AND r.source = ANY($3::text[])
           ) deduped
          WHERE deduped.period_rn = 1
       ) limited
      WHERE limited.task_rn <= $4
      ORDER BY limited.task_id, limited.period_end DESC`,
    [params.userId, taskIds, [...RETROACTIVE_HABIT_ACHIEVEMENT_SOURCES], maxPeriods],
  );

  const latestAchievementResult = await pool.query<{ task_id: string; status: LatestAchievementRow['status'] }>(
    `SELECT DISTINCT ON (ha.task_id)
            ha.task_id,
            ha.status
       FROM task_habit_achievements ha
      WHERE ha.user_id = $1::uuid
        AND ha.task_id = ANY($2::uuid[])
      ORDER BY ha.task_id, ha.detected_at DESC`,
    [params.userId, taskIds],
  );

  const latestStatusByTask = new Map(latestAchievementResult.rows.map((row) => [row.task_id, row.status]));
  const periodsByTask = new Map<string, RecalibrationPeriodRow[]>();
  for (const row of periodRows.rows) {
    const current = periodsByTask.get(row.task_id) ?? [];
    current.push({
      period_end: row.period_end,
      expected_target: row.expected_target,
      completions_done: row.completions_done,
      completion_rate: row.completion_rate,
      source: row.source,
    });
    periodsByTask.set(row.task_id, current);
  }

  const rows: HabitAchievementDiagnosticsRow[] = taskResult.rows.map((task) => {
    const periods = periodsByTask.get(task.task_id) ?? [];
    const sorted = [...periods].sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
    const window = sorted.slice(0, config.windowMonths);
    const hasFullWindow = window.length >= config.windowMonths;
    const consecutiveWindowPass = hasFullWindow && isConsecutiveMonthlyWindow(window.map((row) => row.period_end));
    const evaluation = evaluateHabitAchievementWindow(periods, config);
    const latestStatus = latestStatusByTask.get(task.task_id) ?? null;
    const hasActiveAchievementRecord = latestStatus !== null && latestStatus !== 'expired_pending';

    const dominantReason: HabitAchievementDiagnosticsRow['dominantReason'] = evaluation.reason
      ? evaluation.reason
      : hasActiveAchievementRecord
        ? 'already_has_active_achievement_record'
        : 'qualifies';

    return {
      taskId: task.task_id,
      taskName: task.task_name,
      qualifiesOverall: evaluation.qualifies,
      consecutiveWindowPass,
      aggregateCompletionRate: evaluation.aggregatedCompletionRate,
      monthsMeetingGoal: evaluation.monthsMeetingGoal,
      minimumMonthsMeetingGoal: config.minimumMonthsMeetingGoal,
      twoOfThreeMonthsPass: evaluation.monthsMeetingGoal >= config.minimumMonthsMeetingGoal,
      anyMonthBelowFloor: evaluation.monthsBelowFloor > 0,
      monthsEvaluated: evaluation.monthsEvaluated,
      windowMonths: config.windowMonths,
      dominantReason,
      detectedPeriodEnd: evaluation.detectedPeriodEnd,
      latestAchievementStatus: latestStatus,
    };
  });

  return {
    userId: params.userId,
    generatedAt: new Date().toISOString(),
    thresholds: config,
    rows,
  };
}
