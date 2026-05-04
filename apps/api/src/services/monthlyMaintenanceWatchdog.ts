import { pool } from '../db.js';
import { runMonthlyTaskDifficultyCalibration } from './taskDifficultyCalibrationService.js';
import { runUserMonthlyModeUpgradeAggregation } from './modeUpgradeMonthlyAggregationService.js';
import { runMonthlyHabitAchievementDetection } from './habitAchievementService.js';

const WATCHDOG_LOCK_KEY = 928374651;

function toPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonthPeriodKey(now: Date): string {
  return toPeriodKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
}

async function alreadyProcessed(periodKey: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM user_monthly_mode_upgrade_stats
        WHERE period_key = $1
      ) AS exists`,
    [periodKey],
  );

  return Boolean(result.rows[0]?.exists);
}

export async function runMonthlyMaintenanceWatchdog(now: Date = new Date()): Promise<void> {
  const lock = await pool.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [WATCHDOG_LOCK_KEY]);
  const hasLock = Boolean(lock.rows[0]?.locked);

  if (!hasLock) {
    return;
  }

  try {
    const periodKey = previousMonthPeriodKey(now);
    const isAlreadyProcessed = await alreadyProcessed(periodKey);

    if (isAlreadyProcessed) {
      return;
    }

    const calibration = await runMonthlyTaskDifficultyCalibration(now);
    const aggregation = await runUserMonthlyModeUpgradeAggregation({ now, periodKey });

    await runMonthlyHabitAchievementDetection({
      now,
      periodStart: aggregation.periodStart,
      nextPeriodStart: aggregation.nextPeriodStart,
    });

    console.info('[monthly-maintenance-watchdog] recovered missing monthly run', {
      periodKey,
      evaluated: calibration.evaluated,
      adjusted: calibration.adjusted,
      processed: aggregation.processed,
    });
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [WATCHDOG_LOCK_KEY]);
  }
}

