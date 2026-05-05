import { pool } from '../db.js';
import { runMonthlyPipelineForPeriod } from './monthlyPipelineService.js';

const WATCHDOG_LOCK_KEY = 928374651;

function toPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function closedPeriods(now: Date, months = 6): string[] {
  return Array.from({ length: months }, (_, i) => toPeriodKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (i + 1), 1))));
}

export async function runMonthlyMaintenanceWatchdog(now: Date = new Date()): Promise<void> {
  const lock = await pool.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [WATCHDOG_LOCK_KEY]);
  if (!lock.rows[0]?.locked) return;

  try {
    for (const periodKey of closedPeriods(now, 6)) {
      const runResult = await pool.query<{ status: string; updated_at: string }>(
        'SELECT status, updated_at::text FROM monthly_pipeline_runs WHERE period_key = $1',
        [periodKey],
      );
      const current = runResult.rows[0];
      const staleRunning = current?.status === 'running' && Date.now() - new Date(current.updated_at).getTime() > 2 * 60 * 60 * 1000;

      if (!current) {
        console.info('[monthly-pipeline] pending period detected', { periodKey, reason: 'missing_run' });
        await runMonthlyPipelineForPeriod({ periodKey, now });
        continue;
      }

      if (current.status === 'failed' || current.status === 'partial' || staleRunning || current.status === 'pending') {
        if (staleRunning) {
          await pool.query(
            `UPDATE monthly_pipeline_runs
                SET status = 'failed', last_error = 'stale_running_watchdog_timeout', updated_at = NOW()
              WHERE period_key = $1`,
            [periodKey],
          );
        }
        await runMonthlyPipelineForPeriod({ periodKey, now, force: true });
      }
    }
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [WATCHDOG_LOCK_KEY]);
  }
}
