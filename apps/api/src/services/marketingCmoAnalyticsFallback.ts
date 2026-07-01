import type { Pool } from 'pg';
import {
  getPersistedMarketingAnalyticsContextForPeriod,
  type PersistedMarketingAnalyticsContext,
} from './marketingAnalyticsService.js';

type DbPool = Pick<Pool, 'query'>;

type LoaderParams = {
  periodStart: string;
  periodEnd: string;
  dbPool: DbPool;
};

type RunRow = {
  run_id: string;
  period_start: string | Date;
  period_end: string | Date;
};

export async function getBestAvailableMarketingAnalyticsContextForPeriod({
  periodStart,
  periodEnd,
  dbPool,
}: LoaderParams): Promise<PersistedMarketingAnalyticsContext> {
  let exactError: unknown;

  try {
    return await getPersistedMarketingAnalyticsContextForPeriod({
      periodStart,
      periodEnd,
      dbPool,
    });
  } catch (error) {
    exactError = error;
  }

  const fallback = await dbPool.query<RunRow>(
    `SELECT run_id, period_start, period_end
       FROM marketing_analytics_sync_runs
      WHERE status = 'completed'
        AND period_start >= $1::date
        AND period_end <= $2::date
      ORDER BY (period_end - period_start) DESC, completed_at DESC NULLS LAST, started_at DESC
      LIMIT 1`,
    [periodStart, periodEnd],
  );

  const run = fallback.rows[0];
  if (!run) {
    throw exactError;
  }

  const actualStart = normalizeDate(run.period_start);
  const actualEnd = normalizeDate(run.period_end);
  const result = await getPersistedMarketingAnalyticsContextForPeriod({
    periodStart: actualStart,
    periodEnd: actualEnd,
    dbPool,
  });

  return {
    ...result,
    context: {
      ...result.context,
      data_quality: {
        status: 'warning',
        issues: [
          `Partial analytics coverage: requested ${periodStart} -> ${periodEnd}; using ${actualStart} -> ${actualEnd}. No unavailable dates were inferred.`,
          ...result.context.data_quality.issues,
        ],
      },
    },
  };
}

function normalizeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
