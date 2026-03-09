import { pool } from '../db.js';

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
  errors: { taskId: string; reason: string }[];
};

export async function runMonthlyTaskDifficultyCalibration(now: Date = new Date()): Promise<TaskDifficultyCalibrationRun> {
  const result: TaskDifficultyCalibrationRun = { evaluated: 0, adjusted: 0, skipped: 0, errors: [] };

  const difficultiesResult = await pool.query<DifficultyRow>(
    'SELECT difficulty_id, xp_base FROM cat_difficulty ORDER BY xp_base ASC NULLS LAST, difficulty_id ASC',
  );
  const orderedDifficultyIds = difficultiesResult.rows.map((row) => row.difficulty_id);

  const tasksResult = await pool.query<TaskCandidateRow>(
    `SELECT t.task_id, t.user_id, t.difficulty_id, t.created_at::text AS created_at, t.active, u.game_mode_id
       FROM tasks t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.active = TRUE`,
  );

  for (const task of tasksResult.rows) {
    try {
      if (task.difficulty_id == null || !isTaskEligibleForCalibration({ now, createdAt: task.created_at, active: task.active })) {
        result.skipped += 1;
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

      const period = buildAnalysisPeriod({
        now,
        createdAt: task.created_at,
        lastPeriodEnd: lastResult.rows[0]?.period_end ?? null,
      });

      if (!period) {
        result.skipped += 1;
        continue;
      }

      result.evaluated += 1;

      const gameModeResult = await pool.query<GameModeHistoryRow>(
        `SELECT h.game_mode_id, gm.weekly_target
           FROM user_game_mode_history h
      LEFT JOIN cat_game_mode gm ON gm.game_mode_id = h.game_mode_id
          WHERE h.user_id = $1
            AND h.effective_at::date <= $2::date
          ORDER BY h.effective_at DESC
          LIMIT 1`,
        [task.user_id, period.end],
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
          analyzed_at
        ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11, NOW())`,
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
    errors: result.errors.length,
  });

  return result;
}

export async function runTaskDifficultyCalibrationBackfill(now: Date = new Date()): Promise<TaskDifficultyCalibrationRun> {
  return runMonthlyTaskDifficultyCalibration(now);
}
