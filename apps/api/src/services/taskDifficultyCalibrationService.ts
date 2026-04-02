import { pool } from '../db.js';
import { buildGrowthCalibrationFilter } from './taskLifecyclePolicy.js';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

type DifficultyRow = { difficulty_id: number; xp_base: number | string | null };
type TaskCandidateRow = {
  task_id: string;
  user_id: string;
  difficulty_id: number | null;
  created_at: string;
  active: boolean;
  game_mode_id: number | null;
};
type GameModeHistoryRow = { game_mode_id: number; weekly_target: number | string | null };
type CompletionRow = { completed: number | string | null };
type LastCalibrationRow = { period_end: string };
type LastAdminRunRow = { task_difficulty_recalibration_id: string };

type CalibrationAction = 'up' | 'keep' | 'down';

export type DecisionResult = {
  suggestedAction: CalibrationAction;
  finalAction: CalibrationAction;
  newDifficultyId: number;
  completionRate: number;
};

export function decideDifficultyChange(
  completionRate: number,
  currentDifficultyId: number,
  orderedDifficultyIds: number[],
): DecisionResult {
  const index = orderedDifficultyIds.indexOf(currentDifficultyId);
  const safeIndex = index >= 0 ? index : 0;

  const suggestedAction: CalibrationAction = completionRate > 0.8 ? 'down' : completionRate < 0.5 ? 'up' : 'keep';

  let newIndex = safeIndex;
  if (suggestedAction === 'up') {
    newIndex = Math.min(orderedDifficultyIds.length - 1, safeIndex + 1);
  } else if (suggestedAction === 'down') {
    newIndex = Math.max(0, safeIndex - 1);
  }

  const newDifficultyId = orderedDifficultyIds[newIndex] ?? currentDifficultyId;
  const finalAction: CalibrationAction = newDifficultyId > currentDifficultyId ? 'up' : newDifficultyId < currentDifficultyId ? 'down' : 'keep';

  return { suggestedAction, finalAction, newDifficultyId, completionRate };
}

function parseDateOnly(value: string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfPreviousMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
}



export function isTaskEligibleForCalibration(params: { now: Date; createdAt: string; active: boolean }): boolean {
  if (!params.active) {
    return false;
  }

  const eligibilityDate = addDays(parseDateOnly(params.createdAt), 30);
  const previousMonthEnd = endOfPreviousMonth(params.now);
  return eligibilityDate <= previousMonthEnd;
}
export function buildAnalysisPeriod(params: { now: Date; createdAt: string; lastPeriodEnd: string | null }): { start: string; end: string } | null {
  const eligibilityDate = addDays(parseDateOnly(params.createdAt), 30);
  const previousMonthEnd = endOfPreviousMonth(params.now);
  if (eligibilityDate > previousMonthEnd) {
    return null;
  }

  const fromLast = params.lastPeriodEnd ? addDays(parseDateOnly(params.lastPeriodEnd), 1) : null;
  const startDate = fromLast && fromLast > eligibilityDate ? fromLast : eligibilityDate;

  if (startDate > previousMonthEnd) {
    return null;
  }

  return { start: formatDate(startDate), end: formatDate(previousMonthEnd) };
}

export function resolveWeeklyTarget(events: { gameModeId: number; weeklyTarget: number; effectiveAt: string }[], periodEnd: string): { gameModeId: number; weeklyTarget: number } | null {
  const end = new Date(periodEnd).getTime();
  const valid = events.filter((event) => new Date(event.effectiveAt).getTime() <= end);
  if (valid.length === 0) {
    return null;
  }
  valid.sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime());
  return { gameModeId: valid[0].gameModeId, weeklyTarget: valid[0].weeklyTarget };
}

export type TaskDifficultyCalibrationRun = {
  evaluated: number;
  adjusted: number;
  skipped: number;
  ignored: number;
  actionBreakdown: { up: number; keep: number; down: number };
  errors: { taskId: string; reason: string }[];
};

type CalibrationRunSource = 'cron' | 'admin_run' | 'admin_monthly_backfill';

type RunCalibrationOptions = {
  now?: Date;
  userId?: string;
  windowDays?: number;
  source?: CalibrationRunSource;
  mode?: 'baseline';
  dedupeByDay?: boolean;
};

async function runTaskDifficultyCalibrationEngine(options: RunCalibrationOptions = {}): Promise<TaskDifficultyCalibrationRun> {
  const now = options.now ?? new Date();
  const source = options.source ?? 'cron';
  const dedupeByDay = options.dedupeByDay ?? false;
  const windowDays = options.windowDays ?? 90;

  const result: TaskDifficultyCalibrationRun = {
    evaluated: 0,
    adjusted: 0,
    skipped: 0,
    ignored: 0,
    actionBreakdown: { up: 0, keep: 0, down: 0 },
    errors: [],
  };

  const difficultiesResult = await pool.query<DifficultyRow>(
    'SELECT difficulty_id, xp_base FROM cat_difficulty ORDER BY xp_base ASC NULLS LAST, difficulty_id ASC',
  );
  const orderedDifficultyIds = difficultiesResult.rows.map((row) => row.difficulty_id);

  const userFilterSql = options.userId ? 'AND t.user_id = $1::uuid' : '';
  const tasksResult = await pool.query<TaskCandidateRow>(
    `SELECT t.task_id, t.user_id, t.difficulty_id, t.created_at::text AS created_at, t.active, u.game_mode_id
      FROM tasks t
       JOIN users u ON u.user_id = t.user_id
      WHERE ${buildGrowthCalibrationFilter('t')} ${userFilterSql}`,
    options.userId ? [options.userId] : [],
  );

  for (const task of tasksResult.rows) {
    try {
      const adminEligibility = (() => {
        if (source !== 'admin_run') {
          return isTaskEligibleForCalibration({ now, createdAt: task.created_at, active: task.active });
        }
        if (!task.active) {
          return false;
        }
        const ageDays = Math.floor((now.getTime() - parseDateOnly(task.created_at).getTime()) / MS_IN_DAY);
        return ageDays > 30;
      })();

      if (task.difficulty_id == null || !adminEligibility) {
        result.ignored += 1;
        continue;
      }

      const lastResult = await pool.query<LastCalibrationRow>(
        `SELECT period_end::text AS period_end
           FROM task_difficulty_recalibrations
          WHERE task_id = $1
          ORDER BY period_end DESC
          LIMIT 1`,
        [task.task_id],
      );

      const period = source === 'admin_run'
        ? {
            start: formatDate(addDays(new Date(now.toISOString().slice(0, 10)), -Math.max(1, windowDays) + 1)),
            end: formatDate(new Date(now.toISOString().slice(0, 10))),
          }
        : buildAnalysisPeriod({
            now,
            createdAt: task.created_at,
            lastPeriodEnd: lastResult.rows[0]?.period_end ?? null,
          });

      if (!period) {
        result.skipped += 1;
        continue;
      }

      if (source === 'admin_run' && dedupeByDay) {
        const duplicateResult = await pool.query<LastAdminRunRow>(
          `SELECT task_difficulty_recalibration_id
             FROM task_difficulty_recalibrations
            WHERE task_id = $1
              AND source = 'admin_run'
              AND analyzed_at::date = $2::date
            LIMIT 1`,
          [task.task_id, formatDate(now)],
        );

        if (duplicateResult.rows[0]) {
          result.skipped += 1;
          continue;
        }
      }

      result.evaluated += 1;

      const gameModeResult = await pool.query<GameModeHistoryRow>(
        `SELECT h.game_mode_id, gm.weekly_target
           FROM user_game_mode_history h
      LEFT JOIN cat_game_mode gm ON gm.game_mode_id = h.game_mode_id
          WHERE h.user_id = $1
          ORDER BY h.effective_at DESC
          LIMIT 1`,
        [task.user_id],
      );

      const selectedMode = gameModeResult.rows[0];
      const fallbackGameModeId = task.game_mode_id;
      const fallbackModeResult =
        selectedMode == null && fallbackGameModeId != null
          ? await pool.query<{ weekly_target: number | string | null }>('SELECT weekly_target FROM cat_game_mode WHERE game_mode_id = $1', [
              fallbackGameModeId,
            ])
          : null;

      const usedGameModeId = selectedMode?.game_mode_id ?? fallbackGameModeId;
      const weeklyTarget = Number(selectedMode?.weekly_target ?? fallbackModeResult?.rows[0]?.weekly_target ?? 0);

      if (!usedGameModeId || !Number.isFinite(weeklyTarget) || weeklyTarget <= 0) {
        result.skipped += 1;
        continue;
      }

      const completionsResult = await pool.query<CompletionRow>(
        `SELECT COALESCE(SUM(quantity), 0) AS completed
           FROM daily_log
          WHERE task_id = $1
            AND user_id = $2
            AND date BETWEEN $3::date AND $4::date`,
        [task.task_id, task.user_id, period.start, period.end],
      );

      const completions = Number(completionsResult.rows[0]?.completed ?? 0);
      const daysInPeriod = Math.max(1, Math.floor((new Date(period.end).getTime() - new Date(period.start).getTime()) / MS_IN_DAY) + 1);
      const expectedTarget = (weeklyTarget * daysInPeriod) / 7;
      const completionRate = expectedTarget > 0 ? completions / expectedTarget : 0;

      const decision = decideDifficultyChange(completionRate, task.difficulty_id, orderedDifficultyIds);
      result.actionBreakdown[decision.finalAction] += 1;

      if (decision.newDifficultyId !== task.difficulty_id) {
        await pool.query(
          `UPDATE tasks
              SET difficulty_id = $2,
                  xp_base = COALESCE((SELECT xp_base FROM cat_difficulty WHERE difficulty_id = $2), xp_base),
                  updated_at = NOW()
            WHERE task_id = $1`,
          [task.task_id, decision.newDifficultyId],
        );
        result.adjusted += 1;
      }

      await pool.query(
        `INSERT INTO task_difficulty_recalibrations (
          task_id,
          user_id,
          period_start,
          period_end,
          game_mode_id,
          expected_target,
          completions_done,
          completion_rate,
          previous_difficulty_id,
          new_difficulty_id,
          action,
          source,
          analyzed_at
        ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          task.task_id,
          task.user_id,
          period.start,
          period.end,
          usedGameModeId,
          expectedTarget,
          completions,
          completionRate,
          task.difficulty_id,
          decision.newDifficultyId,
          decision.finalAction,
          source,
        ],
      );
    } catch (error) {
      result.errors.push({ taskId: task.task_id, reason: error instanceof Error ? error.message : 'unknown_error' });
    }
  }

  console.info('[task-difficulty-calibration] finished run', {
    evaluated: result.evaluated,
    adjusted: result.adjusted,
    skipped: result.skipped,
    ignored: result.ignored,
    source,
    errors: result.errors.length,
  });

  return result;
}

export async function runMonthlyTaskDifficultyCalibration(now: Date = new Date()): Promise<TaskDifficultyCalibrationRun> {
  return runTaskDifficultyCalibrationEngine({ now, source: 'cron' });
}

export async function runMonthlyTaskDifficultyCalibrationForUser(options: {
  userId: string;
  now?: Date;
}): Promise<TaskDifficultyCalibrationRun> {
  return runTaskDifficultyCalibrationEngine({
    now: options.now ?? new Date(),
    userId: options.userId,
    source: 'cron',
  });
}

export async function runTaskDifficultyCalibrationBackfill(now: Date = new Date()): Promise<TaskDifficultyCalibrationRun> {
  return runTaskDifficultyCalibrationEngine({ now, source: 'admin_run', windowDays: 90, dedupeByDay: true, mode: 'baseline' });
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

type BackfillTaskRow = {
  task_id: string;
  user_id: string;
  created_at: string;
  difficulty_id: number | null;
  game_mode_id: number | null;
};

type ExistingPeriodRow = {
  period_end: string;
};

type GameModeEventRow = {
  game_mode_id: number;
  weekly_target: number | string | null;
  effective_at: string;
};

type WeeklyTargetFallbackRow = {
  weekly_target: number | string | null;
};

type MonthlyRecalibrationBackfillRun = {
  scope: 'single_user' | 'all_users';
  userId: string | null;
  tasksConsidered: number;
  periodsInserted: number;
  periodsSkippedExisting: number;
  periodsSkippedMissingTarget: number;
};

export async function runMonthlyTaskDifficultyCalibrationBackfill(options: {
  userId?: string;
  now?: Date;
}): Promise<MonthlyRecalibrationBackfillRun> {
  const now = options.now ?? new Date();
  const previousMonthEnd = endOfPreviousMonth(now);
  const userFilterSql = options.userId ? 'AND t.user_id = $1::uuid' : '';
  const tasksResult = await pool.query<BackfillTaskRow>(
    `SELECT t.task_id,
            t.user_id,
            t.created_at::text AS created_at,
            t.difficulty_id,
            u.game_mode_id
       FROM tasks t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.deleted_at IS NULL ${userFilterSql}`,
    options.userId ? [options.userId] : [],
  );

  let periodsInserted = 0;
  let periodsSkippedExisting = 0;
  let periodsSkippedMissingTarget = 0;

  for (const task of tasksResult.rows) {
    if (task.difficulty_id == null) {
      continue;
    }

    const eligibilityDate = addDays(parseDateOnly(task.created_at), 30);
    if (eligibilityDate > previousMonthEnd) {
      continue;
    }

    const existingResult = await pool.query<ExistingPeriodRow>(
      `SELECT period_end::text AS period_end
         FROM task_difficulty_recalibrations
        WHERE task_id = $1::uuid
          AND source = ANY($2::text[])`,
      [task.task_id, ['cron', 'admin_monthly_backfill']],
    );
    const existingPeriodEnds = new Set(existingResult.rows.map((row) => row.period_end.slice(0, 10)));

    const gameModeHistoryResult = await pool.query<GameModeEventRow>(
      `SELECT h.game_mode_id,
              gm.weekly_target,
              h.effective_at::text AS effective_at
         FROM user_game_mode_history h
    LEFT JOIN cat_game_mode gm ON gm.game_mode_id = h.game_mode_id
        WHERE h.user_id = $1::uuid
        ORDER BY h.effective_at ASC`,
      [task.user_id],
    );
    const modeEvents = gameModeHistoryResult.rows.map((row) => ({
      gameModeId: Number(row.game_mode_id),
      weeklyTarget: Number(row.weekly_target ?? 0),
      effectiveAt: row.effective_at,
    }));

    let cursor = startOfMonth(eligibilityDate);
    while (cursor <= previousMonthEnd) {
      const monthEnd = endOfMonth(cursor);
      const periodStart = cursor.getTime() === startOfMonth(eligibilityDate).getTime()
        ? eligibilityDate
        : cursor;
      const periodEnd = monthEnd > previousMonthEnd ? previousMonthEnd : monthEnd;
      const periodEndText = formatDate(periodEnd);
      const periodStartText = formatDate(periodStart);

      if (existingPeriodEnds.has(periodEndText)) {
        periodsSkippedExisting += 1;
      } else {
        const selectedMode = resolveWeeklyTarget(modeEvents, periodEndText);
        const fallbackWeeklyTargetResult =
          selectedMode == null && task.game_mode_id != null
            ? await pool.query<WeeklyTargetFallbackRow>('SELECT weekly_target FROM cat_game_mode WHERE game_mode_id = $1', [
                task.game_mode_id,
              ])
            : null;

        const usedGameModeId = selectedMode?.gameModeId ?? task.game_mode_id;
        const weeklyTarget = Number(selectedMode?.weeklyTarget ?? fallbackWeeklyTargetResult?.rows[0]?.weekly_target ?? 0);

        if (!usedGameModeId || !Number.isFinite(weeklyTarget) || weeklyTarget <= 0) {
          periodsSkippedMissingTarget += 1;
        } else {
          const completionsResult = await pool.query<CompletionRow>(
            `SELECT COALESCE(SUM(quantity), 0) AS completed
               FROM daily_log
              WHERE task_id = $1::uuid
                AND user_id = $2::uuid
                AND date BETWEEN $3::date AND $4::date`,
            [task.task_id, task.user_id, periodStartText, periodEndText],
          );
          const completions = Number(completionsResult.rows[0]?.completed ?? 0);
          const daysInPeriod = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / MS_IN_DAY) + 1);
          const expectedTarget = (weeklyTarget * daysInPeriod) / 7;
          const completionRate = expectedTarget > 0 ? completions / expectedTarget : 0;

          await pool.query(
            `INSERT INTO task_difficulty_recalibrations (
              task_id,
              user_id,
              period_start,
              period_end,
              game_mode_id,
              expected_target,
              completions_done,
              completion_rate,
              previous_difficulty_id,
              new_difficulty_id,
              action,
              source,
              analyzed_at
            ) VALUES ($1::uuid, $2::uuid, $3::date, $4::date, $5, $6, $7, $8, $9, $10, 'keep', 'admin_monthly_backfill', NOW())`,
            [
              task.task_id,
              task.user_id,
              periodStartText,
              periodEndText,
              usedGameModeId,
              expectedTarget,
              completions,
              completionRate,
              task.difficulty_id,
              task.difficulty_id,
            ],
          );
          periodsInserted += 1;
        }
      }

      cursor = startOfMonth(new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1)));
    }
  }

  return {
    scope: options.userId ? 'single_user' : 'all_users',
    userId: options.userId ?? null,
    tasksConsidered: tasksResult.rows.length,
    periodsInserted,
    periodsSkippedExisting,
    periodsSkippedMissingTarget,
  };
}

export async function runAdminTaskDifficultyCalibration(options: {
  userId?: string;
  windowDays?: number;
  mode?: 'baseline';
  now?: Date;
}): Promise<TaskDifficultyCalibrationRun> {
  return runTaskDifficultyCalibrationEngine({
    now: options.now ?? new Date(),
    userId: options.userId,
    windowDays: options.windowDays ?? 90,
    mode: options.mode ?? 'baseline',
    source: 'admin_run',
    dedupeByDay: true,
  });
}
