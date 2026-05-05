import { pool } from '../db.js';
import { runMonthlyTaskDifficultyCalibration } from './taskDifficultyCalibrationService.js';
import { runUserMonthlyModeUpgradeAggregation } from './modeUpgradeMonthlyAggregationService.js';
import { runMonthlyHabitAchievementDetection } from './habitAchievementService.js';

type Stage = 'growth_calibration' | 'mode_upgrade_aggregation' | 'habit_achievement';
type RunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'partial';

function parsePeriodKey(periodKey: string): { periodStart: string; nextPeriodStart: string } {
  const [year, month] = periodKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month, 1));
  return { periodStart: start.toISOString().slice(0, 10), nextPeriodStart: next.toISOString().slice(0, 10) };
}

function previousMonthPeriodKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lockKeyForPeriod(periodKey: string): number {
  let hash = 0;
  for (const c of periodKey) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return Math.abs(hash) + 100_000;
}

async function upsertPendingRun(periodKey: string): Promise<void> {
  const { periodStart, nextPeriodStart } = parsePeriodKey(periodKey);
  await pool.query(
    `INSERT INTO monthly_pipeline_runs (period_key, period_start, next_period_start, status)
     VALUES ($1, $2::date, $3::date, 'pending')
     ON CONFLICT (period_key) DO NOTHING`,
    [periodKey, periodStart, nextPeriodStart],
  );
}

export async function runMonthlyPipelineForPeriod(params: { periodKey?: string; now?: Date; force?: boolean }) {
  const now = params.now ?? new Date();
  const periodKey = params.periodKey ?? previousMonthPeriodKey(now);
  const lockKey = lockKeyForPeriod(periodKey);
  const lock = await pool.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
  if (!lock.rows[0]?.locked) return { periodKey, skipped: true, reason: 'period_locked' as const };

  let stage: Stage | null = null;
  try {
    await upsertPendingRun(periodKey);
    const existing = await pool.query<{ status: RunStatus; attempt_count: number }>(
      'SELECT status, attempt_count FROM monthly_pipeline_runs WHERE period_key = $1',
      [periodKey],
    );
    const row = existing.rows[0];
    if (!params.force && row?.status === 'succeeded') {
      return { periodKey, skipped: true, reason: 'already_succeeded' as const };
    }

    await pool.query(
      `UPDATE monthly_pipeline_runs
          SET status = 'running',
              stage = NULL,
              last_error = NULL,
              attempt_count = attempt_count + 1,
              last_attempt_at = NOW(),
              updated_at = NOW()
        WHERE period_key = $1`,
      [periodKey],
    );

    const attempt = (row?.attempt_count ?? 0) + 1;
    const metadata: Record<string, unknown> = {};
    console.info('[monthly-pipeline] pending period detected', { periodKey, attempt });

    stage = 'growth_calibration';
    console.info('[monthly-pipeline] stage started', { periodKey, stage, attempt });
    const calibration = await runMonthlyTaskDifficultyCalibration(now);
    metadata.calibration = calibration;
    console.info('[monthly-pipeline] stage completed', { periodKey, stage, attempt, evaluated: calibration.evaluated, adjusted: calibration.adjusted });

    stage = 'mode_upgrade_aggregation';
    console.info('[monthly-pipeline] stage started', { periodKey, stage, attempt });
    const aggregation = await runUserMonthlyModeUpgradeAggregation({ now, periodKey });
    metadata.aggregation = aggregation;
    console.info('[monthly-pipeline] stage completed', { periodKey, stage, attempt, processed: aggregation.processed });

    stage = 'habit_achievement';
    console.info('[monthly-pipeline] stage started', { periodKey, stage, attempt });
    const habit = await runMonthlyHabitAchievementDetection({ now, periodStart: aggregation.periodStart, nextPeriodStart: aggregation.nextPeriodStart });
    metadata.habitAchievement = habit;
    console.info('[monthly-pipeline] stage completed', { periodKey, stage, attempt, pendingCreated: habit.pendingCreated, evaluated: habit.evaluated });

    await pool.query(
      `UPDATE monthly_pipeline_runs
          SET status = 'succeeded', stage = $2, completed_at = NOW(), metadata = $3::jsonb, updated_at = NOW()
        WHERE period_key = $1`,
      [periodKey, stage, JSON.stringify(metadata)],
    );
    console.info('[monthly-pipeline] succeeded', { periodKey, attempt });
    return { periodKey, attempt, calibration, aggregation, habitAchievement: habit };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    await pool.query(
      `UPDATE monthly_pipeline_runs
          SET status = CASE WHEN $2::text IS NULL THEN 'failed' ELSE 'partial' END,
              stage = $2,
              last_error = $3,
              updated_at = NOW()
        WHERE period_key = $1`,
      [periodKey, stage, message],
    );
    console.error('[monthly-pipeline] failed', { periodKey, stage, error: message, stack: error instanceof Error ? error.stack : undefined });
    throw error;
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [lockKey]);
  }
}

export async function getMonthlyPipelineStatus(periodKey: string) {
  const run = await pool.query('SELECT * FROM monthly_pipeline_runs WHERE period_key = $1', [periodKey]);
  return run.rows[0] ?? null;
}
