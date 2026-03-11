import { pool } from '../db.js';

type AggregationOptions = {
  userId?: string;
  periodKey?: string;
  now?: Date;
};

type AggregateBaseRow = {
  user_id: string;
  game_mode_id: number;
  tasks_total_evaluated: number | string;
  tasks_meeting_goal: number | string;
};

type GameModeRow = {
  game_mode_id: number;
  weekly_target: number | string | null;
};

export type UserMonthlyModeUpgradeAggregationRun = {
  periodKey: string;
  periodStart: string;
  nextPeriodStart: string;
  scope: 'single_user' | 'all_users';
  processed: number;
  persisted: number;
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function periodKeyFromDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
}

function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

export function getPreviousMonthPeriodKey(now: Date): string {
  return periodKeyFromDate(addMonths(firstDayOfMonth(now), -1));
}

export function parsePeriodKey(periodKey: string): { periodStart: string; nextPeriodStart: string } {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) {
    throw new Error('Invalid periodKey format. Expected YYYY-MM');
  }

  const [yearText, monthText] = periodKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid periodKey value. Expected YYYY-MM');
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = addMonths(monthStart, 1);

  return {
    periodStart: monthStart.toISOString().slice(0, 10),
    nextPeriodStart: nextMonthStart.toISOString().slice(0, 10),
  };
}

function computePassRate(tasksTotalEvaluated: number, tasksMeetingGoal: number): number {
  if (tasksTotalEvaluated <= 0) {
    return 0;
  }

  return tasksMeetingGoal / tasksTotalEvaluated;
}

function buildNextModeMap(rows: GameModeRow[]): Map<number, number | null> {
  const sorted = [...rows]
    .filter((row) => Number.isFinite(Number(row.weekly_target)))
    .map((row) => ({ gameModeId: row.game_mode_id, weeklyTarget: Number(row.weekly_target) }))
    .sort((a, b) => a.weeklyTarget - b.weeklyTarget || a.gameModeId - b.gameModeId);

  const nextMap = new Map<number, number | null>();

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    let next: number | null = null;

    for (let pointer = index + 1; pointer < sorted.length; pointer += 1) {
      if (sorted[pointer].weeklyTarget > current.weeklyTarget) {
        next = sorted[pointer].gameModeId;
        break;
      }
    }

    nextMap.set(current.gameModeId, next);
  }

  return nextMap;
}

export async function runUserMonthlyModeUpgradeAggregation(options: AggregationOptions = {}): Promise<UserMonthlyModeUpgradeAggregationRun> {
  const now = options.now ?? new Date();
  const periodKey = options.periodKey ?? getPreviousMonthPeriodKey(now);
  const { periodStart, nextPeriodStart } = parsePeriodKey(periodKey);

  const baseResult = await pool.query<AggregateBaseRow>(
    `SELECT r.user_id,
            r.game_mode_id,
            COUNT(*)::int AS tasks_total_evaluated,
            SUM(CASE WHEN r.completion_rate >= 0.80 THEN 1 ELSE 0 END)::int AS tasks_meeting_goal
       FROM task_difficulty_recalibrations r
      WHERE r.source = 'cron'
        AND r.period_end >= $1::date
        AND r.period_end < $2::date
        AND ($3::uuid IS NULL OR r.user_id = $3::uuid)
      GROUP BY r.user_id, r.game_mode_id`,
    [periodStart, nextPeriodStart, options.userId ?? null],
  );

  await pool.query('BEGIN');
  try {
    await pool.query(
      `DELETE FROM user_monthly_mode_upgrade_stats
        WHERE period_key = $1
          AND ($2::uuid IS NULL OR user_id = $2::uuid)`,
      [periodKey, options.userId ?? null],
    );

    if (baseResult.rows.length > 0) {
      const gameModesResult = await pool.query<GameModeRow>('SELECT game_mode_id, weekly_target FROM cat_game_mode');
      const nextModeMap = buildNextModeMap(gameModesResult.rows);

      for (const row of baseResult.rows) {
        const tasksTotalEvaluated = Number(row.tasks_total_evaluated);
        const tasksMeetingGoal = Number(row.tasks_meeting_goal);
        const taskPassRate = computePassRate(tasksTotalEvaluated, tasksMeetingGoal);
        const eligibleForUpgrade = taskPassRate >= 0.8;
        const nextGameModeId = nextModeMap.get(row.game_mode_id) ?? null;

        await pool.query(
          `INSERT INTO user_monthly_mode_upgrade_stats (
            user_id,
            period_key,
            game_mode_id,
            tasks_total_evaluated,
            tasks_meeting_goal,
            task_pass_rate,
            eligible_for_upgrade,
            next_game_mode_id,
            updated_at
          ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            row.user_id,
            periodKey,
            row.game_mode_id,
            tasksTotalEvaluated,
            tasksMeetingGoal,
            taskPassRate,
            eligibleForUpgrade,
            nextGameModeId,
          ],
        );
      }
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  return {
    periodKey,
    periodStart,
    nextPeriodStart,
    scope: options.userId ? 'single_user' : 'all_users',
    processed: baseResult.rows.length,
    persisted: baseResult.rows.length,
  };
}
