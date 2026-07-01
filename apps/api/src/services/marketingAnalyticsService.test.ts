import { describe, expect, it, vi } from 'vitest';
import { getPersistedMarketingAnalyticsContextForPeriod } from './marketingAnalyticsService.js';

describe('getPersistedMarketingAnalyticsContextForPeriod', () => {
  it('loads a completed persisted run for an exact period', async () => {
    const dbPool = createAnalyticsPool();

    const result = await getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    });

    expect(result.syncRunId).toBe('run-completed');
    expect(result.context.sync_run_id).toBe('run-completed');
    expect(result.context.period_start).toBe('2026-06-01');
    expect(result.context.period_end).toBe('2026-06-30');
    expect(result.context.data_quality.status).toBe('valid');
  });

  it('fails clearly when no run exists for the period', async () => {
    const dbPool = createAnalyticsPool({ completedRun: null, latestRun: null });

    await expect(getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    })).rejects.toMatchObject({
      status: 409,
      code: 'marketing_analytics_run_missing',
    });
  });

  it('fails clearly when the latest period run is not completed', async () => {
    const dbPool = createAnalyticsPool({
      completedRun: null,
      latestRun: { run_id: 'run-running', status: 'running', error_message: null },
    });

    await expect(getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    })).rejects.toMatchObject({
      status: 409,
      code: 'marketing_analytics_run_not_completed',
    });
  });

  it('applies source and page exclusions from settings', async () => {
    const dbPool = createAnalyticsPool();
    const result = await getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    });

    expect(result.context.clean_sources.map((source) => source.source)).toEqual(['instagram']);
    expect(result.context.marketing_pages.map((page) => page.page_path)).toEqual(['/']);
    expect(result.context.top_pages.map((page) => page.page_path)).toContain('/login');
    expect(result.context.marketing_pages.map((page) => page.page_path)).not.toContain('/login');
  });

  it('calculates registered users with internal exclusions', async () => {
    const dbPool = createAnalyticsPool();
    const result = await getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    });

    expect(result.context.registered_users).toEqual({
      total: 10,
      newInPeriod: 3,
      excludedInternal: 2,
    });
  });

  it('classifies marketing pages, product pages, and funnel events', async () => {
    const dbPool = createAnalyticsPool();
    const result = await getPersistedMarketingAnalyticsContextForPeriod({
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      dbPool,
    });

    expect(result.context.marketing_totals.pageViews).toBe(15);
    expect(result.context.product_totals.pageViews).toBe(8);
    expect(result.context.product_pages.map((page) => page.page_path)).toEqual(['/innerbloom2/dashboard']);
    expect(result.context.funnel_events.map((event) => event.event_name)).toEqual(['page_view', 'landing_cta_clicked']);
  });
});

type AnalyticsPoolOptions = {
  completedRun?: Record<string, unknown> | null;
  latestRun?: Record<string, unknown> | null;
};

function createAnalyticsPool(options: AnalyticsPoolOptions = {}) {
  const completedRun = options.completedRun === undefined
    ? {
        run_id: 'run-completed',
        status: 'completed',
        period_start: '2026-06-01',
        period_end: '2026-06-30',
        started_at: '2026-07-01T00:00:00.000Z',
        completed_at: '2026-07-01T00:05:00.000Z',
        error_message: null,
      }
    : options.completedRun;
  const latestRun = options.latestRun === undefined
    ? null
    : options.latestRun;

  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes("AND status = 'completed'")) {
        return { rows: completedRun ? [completedRun] : [] };
      }

      if (sql.includes('FROM marketing_analytics_sync_runs')) {
        return { rows: latestRun ? [latestRun] : [] };
      }

      if (sql.includes('FROM marketing_analytics_settings')) {
        return {
          rows: [
            {
              excluded_sources: ['accounts.google.com'],
              excluded_page_prefixes: ['/login'],
              product_page_prefixes: ['/innerbloom2'],
              marketing_page_paths: ['/'],
              internal_user_emails: ['admin@example.com'],
              internal_user_ids: [],
            },
          ],
        };
      }

      if (sql.includes('FROM marketing_insights')) {
        return { rows: [{ summary: { totals: { sessions: 20 }, highlights: ['Persisted insight'] } }] };
      }

      if (sql.includes('FROM marketing_ga4_page_metrics')) {
        return {
          rows: [
            { page_path: '/', page_title: 'Landing', active_users: 9, sessions: 12, screen_page_views: 15, event_count: 20 },
            { page_path: '/innerbloom2/dashboard', page_title: 'Dashboard', active_users: 4, sessions: 5, screen_page_views: 8, event_count: 12 },
            { page_path: '/login', page_title: 'Login', active_users: 2, sessions: 2, screen_page_views: 4, event_count: 5 },
          ],
        };
      }

      if (sql.includes('FROM marketing_ga4_source_metrics')) {
        return {
          rows: [
            { source: 'instagram', medium: 'social', campaign: 'ib20_mvp', active_users: 8, sessions: 10, screen_page_views: 15 },
            { source: 'accounts.google.com', medium: 'referral', campaign: '', active_users: 2, sessions: 2, screen_page_views: 4 },
          ],
        };
      }

      if (sql.includes('FROM marketing_ga4_event_metrics')) {
        return {
          rows: [
            { event_name: 'page_view', event_count: 20 },
            { event_name: 'landing_cta_clicked', event_count: 5 },
            { event_name: 'scroll', event_count: 10 },
          ],
        };
      }

      if (sql.includes('FROM marketing_gsc_query_page_metrics')) {
        return {
          rows: [
            { query: 'innerbloom', page: 'https://innerbloomjourney.org/', clicks: 1, impressions: 20, ctr: 0.05, position: 8 },
          ],
        };
      }

      if (sql.includes('FROM users')) {
        return {
          rows: [
            { total: '10', new_in_period: '3', excluded_internal: '2' },
          ],
        };
      }

      return { rows: [] };
    }),
  };
}
