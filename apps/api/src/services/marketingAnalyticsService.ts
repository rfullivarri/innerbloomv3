import { randomUUID } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
import type { Pool } from 'pg';
import { HttpError } from '../lib/http-error.js';
import { pool, withClient } from '../db.js';

const GOOGLE_TOKEN_SCOPE = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

const DEFAULT_WINDOW_DAYS = 28;

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleAccessToken = {
  token: string;
  expiresAtMs: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

type Ga4MetricRow = {
  dimensions: string[];
  metrics: number[];
};

type GscMetricRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type GoogleMetricValue = {
  value?: unknown;
};

type Ga4ApiRow = {
  dimensionValues?: GoogleMetricValue[];
  metricValues?: GoogleMetricValue[];
};

type Ga4ApiResponse = {
  rows?: Ga4ApiRow[];
};

type GscApiRow = {
  keys?: unknown[];
  clicks?: unknown;
  impressions?: unknown;
  ctr?: unknown;
  position?: unknown;
};

type GscApiResponse = {
  rows?: GscApiRow[];
};

export type MarketingAnalyticsSettings = {
  excludedSources: string[];
  excludedPagePrefixes: string[];
  productPagePrefixes: string[];
  marketingPagePaths: string[];
  internalUserEmails: string[];
  internalUserIds: string[];
};

type MarketingAnalyticsSettingsRow = {
  excluded_sources: string[] | null;
  excluded_page_prefixes: string[] | null;
  product_page_prefixes: string[] | null;
  marketing_page_paths: string[] | null;
  internal_user_emails: string[] | null;
  internal_user_ids: string[] | null;
};

type PageMetricRecord = {
  page_path: string;
  page_title: string;
  active_users: number;
  sessions: number;
  screen_page_views: number;
  event_count: number;
};

type SourceMetricRecord = {
  source: string;
  medium: string;
  campaign: string;
  active_users: number;
  sessions: number;
  screen_page_views: number;
};

type QueryMetricRecord = {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type RegisteredUserStats = {
  total: number;
  newInPeriod: number;
  excludedInternal: number;
};

type DbPool = Pick<Pool, 'query'>;

export type PersistedMarketingAnalyticsContextParams = {
  periodStart: string;
  periodEnd: string;
  dbPool?: DbPool;
};

export type PersistedMarketingAnalyticsContext = {
  context: {
    sync_run_id: string;
    period_start: string;
    period_end: string;
    data_quality: {
      status: 'valid' | 'warning';
      issues: string[];
    };
    marketing_totals: ReturnType<typeof sumPageRecords>;
    product_totals: ReturnType<typeof sumPageRecords>;
    registered_users: RegisteredUserStats;
    top_pages: PageMetricRecord[];
    marketing_pages: PageMetricRecord[];
    product_pages: PageMetricRecord[];
    top_sources: SourceMetricRecord[];
    clean_sources: SourceMetricRecord[];
    top_events: { event_name: string; event_count: number }[];
    search_console_queries: QueryMetricRecord[];
    funnel_events: { event_name: string; event_count: number }[];
    insights: Record<string, unknown> | null;
    settings: MarketingAnalyticsSettings;
  };
  syncRunId: string;
  updatedAt: string;
};

const DEFAULT_MARKETING_ANALYTICS_SETTINGS: MarketingAnalyticsSettings = {
  excludedSources: ['accounts.google.com'],
  excludedPagePrefixes: ['/login', '/login2', '/sign-up', '/sign-up2', '/onboarding', '/onboarding2', '/sso-callback'],
  productPagePrefixes: ['/innerbloom2', '/dashboard', '/dashboard-v3', '/editor'],
  marketingPagePaths: ['/', '/v2', '/v3'],
  internalUserEmails: ['ramagpt23@gmail.com', 'rfullivarri22@gmail.com'],
  internalUserIds: [],
};

let cachedGoogleToken: GoogleAccessToken | null = null;
let schemaReady: Promise<void> | null = null;

export type MarketingAnalyticsSyncOptions = Partial<DateRange> & {
  force?: boolean;
};

export async function getMarketingAnalyticsStatus() {
  await ensureMarketingAnalyticsSchema();
  const config = getMarketingAnalyticsConfig();
  const latestRun = await getLatestRun();
  const settings = await getMarketingAnalyticsSettings();

  return {
    configured: config.configured,
    missing: config.missing,
    ga4PropertyId: config.ga4PropertyId || null,
    gscSiteUrl: config.gscSiteUrl || null,
    latestRun,
    settings,
  };
}

export async function getMarketingAnalyticsInsights() {
  await ensureMarketingAnalyticsSchema();
  const config = getMarketingAnalyticsConfig();
  const latestRun = await getLatestRun();
  const settings = await getMarketingAnalyticsSettings();

  if (!latestRun || latestRun.status !== 'completed') {
    return {
      configured: config.configured,
      missing: config.missing,
      latestRun,
      settings,
      summary: null,
      topPages: [],
      topSources: [],
      marketingPages: [],
      productPages: [],
      cleanSources: [],
      topEvents: [],
      topQueries: [],
      registeredUsers: null,
    };
  }

  const [insightResult, pageResult, sourceResult, eventResult, queryResult] = await Promise.all([
    pool.query<{ summary: unknown }>('SELECT summary FROM marketing_insights WHERE run_id = $1 LIMIT 1', [latestRun.runId]),
    pool.query<PageMetricRecord>(
      `SELECT page_path, page_title, active_users, sessions, screen_page_views, event_count
       FROM marketing_ga4_page_metrics
       WHERE run_id = $1
       ORDER BY screen_page_views DESC, active_users DESC
       LIMIT 100`,
      [latestRun.runId],
    ),
    pool.query<SourceMetricRecord>(
      `SELECT source, medium, campaign, active_users, sessions, screen_page_views
       FROM marketing_ga4_source_metrics
       WHERE run_id = $1
       ORDER BY sessions DESC, active_users DESC
       LIMIT 100`,
      [latestRun.runId],
    ),
    pool.query<{ event_name: string; event_count: number }>(
      `SELECT event_name, event_count
       FROM marketing_ga4_event_metrics
       WHERE run_id = $1
       ORDER BY event_count DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
    pool.query<QueryMetricRecord>(
      `SELECT query, page, clicks, impressions, ctr::float AS ctr, position::float AS position
       FROM marketing_gsc_query_page_metrics
       WHERE run_id = $1
       ORDER BY impressions DESC, clicks DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
  ]);
  const registeredUsers = await getRegisteredUserStats(latestRun.periodStart, latestRun.periodEnd, settings);
  const topPages = pageResult.rows.map(normalizePageMetricRecord);
  const topSources = sourceResult.rows.map(normalizeSourceMetricRecord);
  const topQueries = queryResult.rows.map(normalizeQueryMetricRecord);
  const visiblePages = topPages.filter((row) => !isExcludedPage(row.page_path, settings));
  const marketingPages = visiblePages.filter((row) => isMarketingPage(row.page_path, settings));
  const productPages = visiblePages.filter((row) => isProductPage(row.page_path, settings));
  const cleanSources = topSources.filter((row) => !isExcludedSource(row.source, settings));
  const rawSummary = readSummaryRecord(insightResult.rows[0]?.summary);
  const summary = rawSummary
    ? decorateMarketingSummary(rawSummary, {
        marketingPages,
        productPages,
        cleanSources,
        topQueries,
        registeredUsers,
      })
    : null;

  return {
    configured: config.configured,
    missing: config.missing,
    latestRun,
    settings,
    summary,
    topPages,
    topSources,
    marketingPages,
    productPages,
    cleanSources,
    topEvents: eventResult.rows,
    topQueries,
    registeredUsers,
  };
}

export async function getPersistedMarketingAnalyticsContextForPeriod({
  periodStart,
  periodEnd,
  dbPool = pool,
}: PersistedMarketingAnalyticsContextParams): Promise<PersistedMarketingAnalyticsContext> {
  const [startDate, endDate] = [
    assertDateOnly(periodStart, 'periodStart'),
    assertDateOnly(periodEnd, 'periodEnd'),
  ];
  const completedRun = await dbPool.query<{
    run_id: string;
    status: string;
    period_start: string | Date;
    period_end: string | Date;
    started_at: string | Date;
    completed_at: string | Date | null;
    error_message: string | null;
  }>(
    `SELECT run_id, status, period_start, period_end, started_at, completed_at, error_message
       FROM marketing_analytics_sync_runs
      WHERE period_start = $1::date
        AND period_end = $2::date
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, started_at DESC
      LIMIT 1`,
    [startDate, endDate],
  );

  const run = completedRun.rows[0];
  if (!run) {
    const latestRunForPeriod = await dbPool.query<{
      run_id: string;
      status: string;
      error_message: string | null;
    }>(
      `SELECT run_id, status, error_message
         FROM marketing_analytics_sync_runs
        WHERE period_start = $1::date
          AND period_end = $2::date
        ORDER BY started_at DESC
        LIMIT 1`,
      [startDate, endDate],
    );
    const latest = latestRunForPeriod.rows[0];
    if (latest) {
      throw new HttpError(
        409,
        'marketing_analytics_run_not_completed',
        `Marketing analytics run ${latest.run_id} for ${startDate} -> ${endDate} is ${latest.status}.`,
      );
    }

    throw new HttpError(
      409,
      'marketing_analytics_run_missing',
      `No completed marketing analytics run found for ${startDate} -> ${endDate}.`,
    );
  }

  const settings = await getMarketingAnalyticsSettings(dbPool);
  const [insightResult, pageResult, sourceResult, eventResult, queryResult] = await Promise.all([
    dbPool.query<{ summary: unknown }>('SELECT summary FROM marketing_insights WHERE run_id = $1 LIMIT 1', [run.run_id]),
    dbPool.query<PageMetricRecord>(
      `SELECT page_path, page_title, active_users, sessions, screen_page_views, event_count
         FROM marketing_ga4_page_metrics
        WHERE run_id = $1
        ORDER BY screen_page_views DESC, active_users DESC
        LIMIT 100`,
      [run.run_id],
    ),
    dbPool.query<SourceMetricRecord>(
      `SELECT source, medium, campaign, active_users, sessions, screen_page_views
         FROM marketing_ga4_source_metrics
        WHERE run_id = $1
        ORDER BY sessions DESC, active_users DESC
        LIMIT 100`,
      [run.run_id],
    ),
    dbPool.query<{ event_name: string; event_count: number }>(
      `SELECT event_name, event_count
         FROM marketing_ga4_event_metrics
        WHERE run_id = $1
        ORDER BY event_count DESC
        LIMIT 100`,
      [run.run_id],
    ),
    dbPool.query<QueryMetricRecord>(
      `SELECT query, page, clicks, impressions, ctr::float AS ctr, position::float AS position
         FROM marketing_gsc_query_page_metrics
        WHERE run_id = $1
        ORDER BY impressions DESC, clicks DESC
        LIMIT 100`,
      [run.run_id],
    ),
  ]);

  const topPages = pageResult.rows.map(normalizePageMetricRecord);
  const topSources = sourceResult.rows.map(normalizeSourceMetricRecord);
  const topEvents = eventResult.rows.map((row) => ({
    event_name: String(row.event_name ?? ''),
    event_count: toInteger(row.event_count),
  }));
  const searchConsoleQueries = queryResult.rows.map(normalizeQueryMetricRecord);
  const visiblePages = topPages.filter((row) => !isExcludedPage(row.page_path, settings));
  const marketingPages = visiblePages.filter((row) => isMarketingPage(row.page_path, settings));
  const productPages = visiblePages.filter((row) => isProductPage(row.page_path, settings));
  const cleanSources = topSources.filter((row) => !isExcludedSource(row.source, settings));
  const registeredUsers = await getRegisteredUserStats(startDate, endDate, settings, dbPool);
  const insights = readSummaryRecord(insightResult.rows[0]?.summary);
  const issues = [
    ...(insights ? [] : ['marketing_insights row is missing for the selected run.']),
    ...(topPages.length ? [] : ['No GA4 page metrics are available for the selected run.']),
    ...(topSources.length ? [] : ['No GA4 source metrics are available for the selected run.']),
    ...(topEvents.length ? [] : ['No GA4 event metrics are available for the selected run.']),
    ...(searchConsoleQueries.length ? [] : ['No Search Console query metrics are available for the selected run.']),
  ];

  return {
    syncRunId: run.run_id,
    updatedAt: run.completed_at ? toIsoString(run.completed_at) : toIsoString(run.started_at),
    context: {
      sync_run_id: run.run_id,
      period_start: toDateString(run.period_start),
      period_end: toDateString(run.period_end),
      data_quality: {
        status: issues.length ? 'warning' : 'valid',
        issues,
      },
      marketing_totals: sumPageRecords(marketingPages),
      product_totals: sumPageRecords(productPages),
      registered_users: registeredUsers,
      top_pages: topPages,
      marketing_pages: marketingPages,
      product_pages: productPages,
      top_sources: topSources,
      clean_sources: cleanSources,
      top_events: topEvents,
      search_console_queries: searchConsoleQueries,
      funnel_events: topEvents.filter((row) => isFunnelEvent(row.event_name)),
      insights,
      settings,
    },
  };
}

export async function updateMarketingAnalyticsSettings(input: Partial<MarketingAnalyticsSettings>) {
  await ensureMarketingAnalyticsSchema();
  const current = await getMarketingAnalyticsSettings();
  const next: MarketingAnalyticsSettings = {
    excludedSources: normalizeStringList(input.excludedSources, current.excludedSources),
    excludedPagePrefixes: normalizePathList(input.excludedPagePrefixes, current.excludedPagePrefixes),
    productPagePrefixes: normalizePathList(input.productPagePrefixes, current.productPagePrefixes),
    marketingPagePaths: normalizePathList(input.marketingPagePaths, current.marketingPagePaths),
    internalUserEmails: normalizeStringList(input.internalUserEmails, current.internalUserEmails).map((email) => email.toLowerCase()),
    internalUserIds: normalizeUuidList(input.internalUserIds, current.internalUserIds),
  };

  await pool.query(
    `INSERT INTO marketing_analytics_settings (
      id,
      excluded_sources,
      excluded_page_prefixes,
      product_page_prefixes,
      marketing_page_paths,
      internal_user_emails,
      internal_user_ids,
      updated_at
    ) VALUES (true, $1, $2, $3, $4, $5, $6::uuid[], now())
    ON CONFLICT (id) DO UPDATE SET
      excluded_sources = EXCLUDED.excluded_sources,
      excluded_page_prefixes = EXCLUDED.excluded_page_prefixes,
      product_page_prefixes = EXCLUDED.product_page_prefixes,
      marketing_page_paths = EXCLUDED.marketing_page_paths,
      internal_user_emails = EXCLUDED.internal_user_emails,
      internal_user_ids = EXCLUDED.internal_user_ids,
      updated_at = now()`,
    [
      next.excludedSources,
      next.excludedPagePrefixes,
      next.productPagePrefixes,
      next.marketingPagePaths,
      next.internalUserEmails,
      next.internalUserIds,
    ],
  );

  return next;
}

export async function runMarketingAnalyticsSync(options: MarketingAnalyticsSyncOptions = {}) {
  await ensureMarketingAnalyticsSchema();
  const config = getMarketingAnalyticsConfig();

  if (!config.configured) {
    throw new HttpError(503, 'marketing_analytics_not_configured', 'Marketing analytics is not configured.', {
      missing: config.missing,
    });
  }

  const dateRange = normalizeDateRange(options);
  const runId = `marketing-${dateRange.startDate}-${dateRange.endDate}-${randomUUID()}`;

  await pool.query(
    `INSERT INTO marketing_analytics_sync_runs (
      run_id,
      status,
      period_start,
      period_end,
      ga4_property_id,
      gsc_site_url
    ) VALUES ($1, 'running', $2, $3, $4, $5)`,
    [runId, dateRange.startDate, dateRange.endDate, config.ga4PropertyId, config.gscSiteUrl],
  );

  try {
    const token = await getGoogleAccessToken(config.serviceAccount);
    const [ga4Totals, ga4Pages, ga4Sources, ga4Events, gscQueries] = await Promise.all([
      fetchGa4Rows(config.ga4PropertyId, token, dateRange, [], [
        'activeUsers',
        'sessions',
        'screenPageViews',
        'eventCount',
      ]),
      fetchGa4Rows(config.ga4PropertyId, token, dateRange, ['pagePath', 'pageTitle'], [
        'activeUsers',
        'sessions',
        'screenPageViews',
        'eventCount',
      ]),
      fetchGa4Rows(config.ga4PropertyId, token, dateRange, ['sessionSource', 'sessionMedium', 'sessionCampaignName'], [
        'activeUsers',
        'sessions',
        'screenPageViews',
      ]),
      fetchGa4Rows(config.ga4PropertyId, token, dateRange, ['eventName'], ['eventCount']),
      fetchGscRows(config.gscSiteUrl, token, dateRange),
    ]);

    const summary = buildMarketingInsightSummary({
      runId,
      dateRange,
      ga4Totals,
      ga4Pages,
      ga4Sources,
      gscQueries,
    });

    await withClient(async (client) => {
      await client.query('BEGIN');
      try {
        for (const row of ga4Pages) {
          await client.query(
            `INSERT INTO marketing_ga4_page_metrics (
              run_id,
              page_path,
              page_title,
              active_users,
              sessions,
              screen_page_views,
              event_count
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              runId,
              row.dimensions[0] ?? '',
              row.dimensions[1] ?? '',
              toInteger(row.metrics[0]),
              toInteger(row.metrics[1]),
              toInteger(row.metrics[2]),
              toInteger(row.metrics[3]),
            ],
          );
        }

        for (const row of ga4Sources) {
          await client.query(
            `INSERT INTO marketing_ga4_source_metrics (
              run_id,
              source,
              medium,
              campaign,
              active_users,
              sessions,
              screen_page_views
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              runId,
              row.dimensions[0] ?? '',
              row.dimensions[1] ?? '',
              row.dimensions[2] ?? '',
              toInteger(row.metrics[0]),
              toInteger(row.metrics[1]),
              toInteger(row.metrics[2]),
            ],
          );
        }

        for (const row of ga4Events) {
          await client.query(
            `INSERT INTO marketing_ga4_event_metrics (run_id, event_name, event_count)
             VALUES ($1, $2, $3)`,
            [runId, row.dimensions[0] ?? '', toInteger(row.metrics[0])],
          );
        }

        for (const row of gscQueries) {
          await client.query(
            `INSERT INTO marketing_gsc_query_page_metrics (
              run_id,
              query,
              page,
              clicks,
              impressions,
              ctr,
              position
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              runId,
              row.keys[0] ?? '',
              row.keys[1] ?? '',
              toInteger(row.clicks),
              toInteger(row.impressions),
              row.ctr,
              row.position,
            ],
          );
        }

        await client.query(
          `INSERT INTO marketing_insights (run_id, summary)
           VALUES ($1, $2::jsonb)`,
          [runId, JSON.stringify(summary)],
        );

        await client.query(
          `UPDATE marketing_analytics_sync_runs
           SET status = 'completed', completed_at = now()
           WHERE run_id = $1`,
          [runId],
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });

    return {
      ok: true,
      runId,
      periodStart: dateRange.startDate,
      periodEnd: dateRange.endDate,
      rows: {
        ga4Pages: ga4Pages.length,
        ga4Sources: ga4Sources.length,
        ga4Events: ga4Events.length,
        gscQueries: gscQueries.length,
      },
      summary,
    };
  } catch (error) {
    await pool.query(
      `UPDATE marketing_analytics_sync_runs
       SET status = 'failed', completed_at = now(), error_message = $2
       WHERE run_id = $1`,
      [runId, error instanceof Error ? error.message : 'Unknown marketing analytics sync error'],
    );

    throw error;
  }
}

function buildMarketingInsightSummary({
  runId,
  dateRange,
  ga4Totals,
  ga4Pages,
  ga4Sources,
  gscQueries,
}: {
  runId: string;
  dateRange: DateRange;
  ga4Totals: Ga4MetricRow[];
  ga4Pages: Ga4MetricRow[];
  ga4Sources: Ga4MetricRow[];
  gscQueries: GscMetricRow[];
}) {
  const aggregateTotals = ga4Totals[0]?.metrics ?? [];
  const totals = {
    activeUsers: toInteger(aggregateTotals[0]),
    sessions: toInteger(aggregateTotals[1]),
    pageViews: toInteger(aggregateTotals[2]),
    events: toInteger(aggregateTotals[3]),
    searchClicks: gscQueries.reduce((total, row) => total + toInteger(row.clicks), 0),
    searchImpressions: gscQueries.reduce((total, row) => total + toInteger(row.impressions), 0),
  };

  const topLandingPage = sortGa4RowsByMetric(ga4Pages, 2)[0] ?? null;
  const topSource = sortGa4RowsByMetric(ga4Sources, 1)[0] ?? null;
  const topQuery = [...gscQueries].sort((left, right) => right.impressions - left.impressions)[0] ?? null;

  return {
    runId,
    periodStart: dateRange.startDate,
    periodEnd: dateRange.endDate,
    totals,
    highlights: [
      topLandingPage
        ? `Top landing page: ${topLandingPage.dimensions[0]} with ${toInteger(topLandingPage.metrics[2])} views.`
        : 'No GA4 landing page data returned.',
      topSource
        ? `Top acquisition source: ${[topSource.dimensions[0], topSource.dimensions[1]].filter(Boolean).join(' / ')}.`
        : 'No GA4 acquisition source data returned.',
      topQuery
        ? `Top search query: "${topQuery.keys[0]}" with ${toInteger(topQuery.impressions)} impressions.`
        : 'No Search Console query data returned.',
    ],
  };
}

function decorateMarketingSummary(
  summary: Record<string, unknown>,
  {
    marketingPages,
    productPages,
    cleanSources,
    topQueries,
    registeredUsers,
  }: {
    marketingPages: PageMetricRecord[];
    productPages: PageMetricRecord[];
    cleanSources: SourceMetricRecord[];
    topQueries: QueryMetricRecord[];
    registeredUsers: RegisteredUserStats;
  },
) {
  const rawTotals = readTotals(summary.totals);
  const marketingTotals = sumPageRecords(marketingPages);
  const productTotals = sumPageRecords(productPages);
  const topMarketingPage = [...marketingPages].sort(byPageViews)[0] ?? null;
  const topProductPage = [...productPages].sort(byPageViews)[0] ?? null;
  const topSource = [...cleanSources].sort((left, right) => right.sessions - left.sessions)[0] ?? null;
  const topQuery = [...topQueries].sort((left, right) => right.impressions - left.impressions)[0] ?? null;
  const highlights = [
    topMarketingPage
      ? `Top marketing landing: ${topMarketingPage.page_path} with ${topMarketingPage.screen_page_views} views.`
      : 'No clean marketing landing page data returned yet.',
    topProductPage
      ? `Top product page: ${topProductPage.page_path} with ${topProductPage.screen_page_views} views.`
      : 'No product usage page data returned yet.',
    topSource
      ? `Top acquisition source after filters: ${formatSourceLabel(topSource)} with ${topSource.sessions} sessions.`
      : 'No clean acquisition source data returned yet.',
    topQuery
      ? `Top search query: "${topQuery.query}" with ${toInteger(topQuery.impressions)} impressions.`
      : 'No Search Console query data returned yet.',
  ];

  return {
    ...summary,
    totals: rawTotals,
    rawTotals,
    marketingTotals,
    productTotals,
    registeredUsers,
    highlights,
    notes: [
      'GA active users are anonymous, cookie/device-based visitors. They are not the same number as registered Neon users.',
      'Landing and product page rows are directional rankings. Aggregate GA totals come from a no-dimension GA4 report.',
      'Configured auth/internal sources and internal users are filtered from the clean dashboard views.',
    ],
  };
}

function readSummaryRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readTotals(value: unknown) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

  return {
    activeUsers: toInteger(record.activeUsers),
    sessions: toInteger(record.sessions),
    pageViews: toInteger(record.pageViews),
    events: toInteger(record.events),
    searchClicks: toInteger(record.searchClicks),
    searchImpressions: toInteger(record.searchImpressions),
  };
}

function sumPageRecords(rows: PageMetricRecord[]) {
  return rows.reduce(
    (totals, row) => ({
      activeUsers: totals.activeUsers + toInteger(row.active_users),
      sessions: totals.sessions + toInteger(row.sessions),
      pageViews: totals.pageViews + toInteger(row.screen_page_views),
      events: totals.events + toInteger(row.event_count),
    }),
    { activeUsers: 0, sessions: 0, pageViews: 0, events: 0 },
  );
}

function byPageViews(left: PageMetricRecord, right: PageMetricRecord) {
  return right.screen_page_views - left.screen_page_views;
}

function normalizePageMetricRecord(row: PageMetricRecord): PageMetricRecord {
  return {
    page_path: normalizePagePath(String(row.page_path ?? '')),
    page_title: String(row.page_title ?? ''),
    active_users: toInteger(row.active_users),
    sessions: toInteger(row.sessions),
    screen_page_views: toInteger(row.screen_page_views),
    event_count: toInteger(row.event_count),
  };
}

function normalizeSourceMetricRecord(row: SourceMetricRecord): SourceMetricRecord {
  return {
    source: String(row.source ?? ''),
    medium: String(row.medium ?? ''),
    campaign: String(row.campaign ?? ''),
    active_users: toInteger(row.active_users),
    sessions: toInteger(row.sessions),
    screen_page_views: toInteger(row.screen_page_views),
  };
}

function normalizeQueryMetricRecord(row: QueryMetricRecord): QueryMetricRecord {
  return {
    query: String(row.query ?? ''),
    page: String(row.page ?? ''),
    clicks: toInteger(row.clicks),
    impressions: toInteger(row.impressions),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  };
}

function normalizePagePath(path: string) {
  const trimmed = path.trim() || '/';
  const withoutQuery = trimmed.split('?')[0]?.split('#')[0] || '/';
  if (withoutQuery === '/') {
    return '/';
  }

  return withoutQuery.endsWith('/') ? withoutQuery.slice(0, -1) : withoutQuery;
}

function isMarketingPage(path: string, settings: MarketingAnalyticsSettings) {
  const normalized = normalizePagePath(path);
  return settings.marketingPagePaths.some((marketingPath) => normalizePagePath(marketingPath) === normalized);
}

function isProductPage(path: string, settings: MarketingAnalyticsSettings) {
  const normalized = normalizePagePath(path);
  return settings.productPagePrefixes.some((prefix) => normalized.startsWith(normalizePagePath(prefix)));
}

function isExcludedPage(path: string, settings: MarketingAnalyticsSettings) {
  const normalized = normalizePagePath(path);
  return settings.excludedPagePrefixes.some((prefix) => normalized.startsWith(normalizePagePath(prefix)));
}

function isExcludedSource(source: string, settings: MarketingAnalyticsSettings) {
  const normalized = source.trim().toLowerCase();
  return settings.excludedSources.some((excludedSource) => {
    const normalizedExcludedSource = excludedSource.trim().toLowerCase();
    return normalizedExcludedSource.length > 0 && normalized.includes(normalizedExcludedSource);
  });
}

function isFunnelEvent(eventName: string) {
  return new Set([
    'page_view',
    'landing_cta_clicked',
    'auth_started',
    'auth_completed',
    'dashboard_view',
    'sign_up',
    'login',
  ]).has(eventName);
}

function formatSourceLabel(row: SourceMetricRecord) {
  return [row.source || '(direct)', row.medium || '(none)'].join(' / ');
}

async function getMarketingAnalyticsSettings(dbPool: DbPool = pool): Promise<MarketingAnalyticsSettings> {
  const result = await dbPool.query<MarketingAnalyticsSettingsRow>(
    `SELECT
      excluded_sources,
      excluded_page_prefixes,
      product_page_prefixes,
      marketing_page_paths,
      internal_user_emails,
      internal_user_ids
     FROM marketing_analytics_settings
     WHERE id = true
     LIMIT 1`,
  );

  if (!result.rows[0]) {
    await dbPool.query('INSERT INTO marketing_analytics_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING');
    return DEFAULT_MARKETING_ANALYTICS_SETTINGS;
  }

  return normalizeSettingsRow(result.rows[0]);
}

function normalizeSettingsRow(row: MarketingAnalyticsSettingsRow): MarketingAnalyticsSettings {
  return {
    excludedSources: normalizeStringList(row.excluded_sources, DEFAULT_MARKETING_ANALYTICS_SETTINGS.excludedSources),
    excludedPagePrefixes: normalizePathList(
      row.excluded_page_prefixes,
      DEFAULT_MARKETING_ANALYTICS_SETTINGS.excludedPagePrefixes,
    ),
    productPagePrefixes: normalizePathList(
      row.product_page_prefixes,
      DEFAULT_MARKETING_ANALYTICS_SETTINGS.productPagePrefixes,
    ),
    marketingPagePaths: normalizePathList(row.marketing_page_paths, DEFAULT_MARKETING_ANALYTICS_SETTINGS.marketingPagePaths),
    internalUserEmails: normalizeStringList(
      row.internal_user_emails,
      DEFAULT_MARKETING_ANALYTICS_SETTINGS.internalUserEmails,
    ).map((email) => email.toLowerCase()),
    internalUserIds: normalizeUuidList(row.internal_user_ids, DEFAULT_MARKETING_ANALYTICS_SETTINGS.internalUserIds),
  };
}

function normalizeStringList(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : fallback;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of source) {
    const text = String(item ?? '').trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(text);
  }

  return result;
}

function normalizePathList(value: unknown, fallback: string[]) {
  return normalizeStringList(value, fallback).map(normalizePagePath);
}

function normalizeUuidList(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : fallback;
  return source
    .map((item) => String(item ?? '').trim())
    .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item));
}

async function getRegisteredUserStats(
  periodStart: string,
  periodEnd: string,
  settings: MarketingAnalyticsSettings,
  dbPool: DbPool = pool,
) {
  const emails = settings.internalUserEmails.map((email) => email.toLowerCase());
  const ids = settings.internalUserIds;
  const result = await dbPool.query<{
    total: string | number;
    new_in_period: string | number;
    excluded_internal: string | number;
  }>(
    `SELECT
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND NOT (
            user_id = ANY($1::uuid[])
            OR lower(coalesce(email_primary, email, '')) = ANY($2::text[])
          )
      ) AS total,
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND created_at::date BETWEEN $3::date AND $4::date
          AND NOT (
            user_id = ANY($1::uuid[])
            OR lower(coalesce(email_primary, email, '')) = ANY($2::text[])
          )
      ) AS new_in_period,
      COUNT(*) FILTER (
        WHERE deleted_at IS NULL
          AND (
            user_id = ANY($1::uuid[])
            OR lower(coalesce(email_primary, email, '')) = ANY($2::text[])
          )
      ) AS excluded_internal
     FROM users`,
    [ids, emails, periodStart, periodEnd],
  );
  const row = result.rows[0];

  return {
    total: toInteger(row?.total),
    newInPeriod: toInteger(row?.new_in_period),
    excludedInternal: toInteger(row?.excluded_internal),
  };
}

async function fetchGa4Rows(
  propertyId: string,
  accessToken: string,
  dateRange: DateRange,
  dimensions: string[],
  metrics: string[],
): Promise<Ga4MetricRow[]> {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dateRanges: [dateRange],
      ...(dimensions.length > 0 ? { dimensions: dimensions.map((name) => ({ name })) } : {}),
      metrics: metrics.map((name) => ({ name })),
      limit: '100',
    }),
  });

  const body = await response.json().catch(() => null) as Ga4ApiResponse | null;
  if (!response.ok) {
    throw new HttpError(response.status, 'ga4_request_failed', 'GA4 Data API request failed.', body);
  }

  return (Array.isArray(body?.rows) ? body.rows : []).map((row) => ({
    dimensions: readGoogleMetricValues(row.dimensionValues).map((value) => String(value ?? '')),
    metrics: readGoogleMetricValues(row.metricValues).map((value) => Number(value ?? 0)),
  }));
}

async function fetchGscRows(siteUrl: string, accessToken: string, dateRange: DateRange): Promise<GscMetricRow[]> {
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions: ['query', 'page'],
        rowLimit: 100,
      }),
    },
  );

  const body = await response.json().catch(() => null) as GscApiResponse | null;
  if (!response.ok) {
    throw new HttpError(response.status, 'gsc_request_failed', 'Search Console API request failed.', body);
  }

  return (Array.isArray(body?.rows) ? body.rows : []).map((row) => ({
    keys: Array.isArray(row.keys) ? row.keys.map((value: unknown) => String(value ?? '')) : [],
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
}

function readGoogleMetricValues(values: GoogleMetricValue[] | undefined) {
  return Array.isArray(values) ? values.map((value) => value.value) : [];
}

async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount) {
  const now = Date.now();
  if (cachedGoogleToken && cachedGoogleToken.expiresAtMs - now > 60_000) {
    return cachedGoogleToken.token;
  }

  const iat = Math.floor(now / 1000);
  const exp = iat + 3600;
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: GOOGLE_TOKEN_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || typeof body?.access_token !== 'string') {
    throw new HttpError(response.status, 'google_auth_failed', 'Google service account authentication failed.', body);
  }

  cachedGoogleToken = {
    token: body.access_token,
    expiresAtMs: now + Number(body.expires_in ?? 3600) * 1000,
  };

  return cachedGoogleToken.token;
}

function getMarketingAnalyticsConfig() {
  const ga4PropertyId = readEnv('GA4_PROPERTY_ID');
  const gscSiteUrl = readEnv('GSC_SITE_URL');
  const serviceAccountRaw = readEnv('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
  const missing = [
    ['GA4_PROPERTY_ID', ga4PropertyId],
    ['GSC_SITE_URL', gscSiteUrl],
    ['GOOGLE_SERVICE_ACCOUNT_JSON_BASE64', serviceAccountRaw],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  let serviceAccount: GoogleServiceAccount | null = null;
  if (serviceAccountRaw) {
    try {
      serviceAccount = JSON.parse(Buffer.from(serviceAccountRaw, 'base64').toString('utf8')) as GoogleServiceAccount;
      if (!serviceAccount.client_email) {
        missing.push('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.client_email');
      }
      if (!serviceAccount.private_key) {
        missing.push('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.private_key');
      }
    } catch {
      missing.push('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64.valid_json');
    }
  }

  return {
    configured: missing.length === 0,
    missing,
    ga4PropertyId,
    gscSiteUrl,
    serviceAccount: serviceAccount as GoogleServiceAccount,
  };
}

async function getLatestRun() {
  const result = await pool.query<{
    run_id: string;
    status: string;
    period_start: string;
    period_end: string;
    ga4_property_id: string | null;
    gsc_site_url: string | null;
    started_at: string;
    completed_at: string | null;
    error_message: string | null;
  }>(
    `SELECT run_id, status, period_start, period_end, ga4_property_id, gsc_site_url, started_at, completed_at, error_message
     FROM marketing_analytics_sync_runs
     ORDER BY started_at DESC
     LIMIT 1`,
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    runId: row.run_id,
    status: row.status,
    periodStart: toDateString(row.period_start),
    periodEnd: toDateString(row.period_end),
    ga4PropertyId: row.ga4_property_id,
    gscSiteUrl: row.gsc_site_url,
    startedAt: toIsoString(row.started_at),
    completedAt: row.completed_at ? toIsoString(row.completed_at) : null,
    errorMessage: row.error_message,
  };
}

function normalizeDateRange(options: MarketingAnalyticsSyncOptions): DateRange {
  if (options.startDate && options.endDate) {
    return {
      startDate: assertDateOnly(options.startDate, 'startDate'),
      endDate: assertDateOnly(options.endDate, 'endDate'),
    };
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DEFAULT_WINDOW_DAYS + 1);

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
  };
}

function assertDateOnly(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'invalid_date_range', `${field} must be YYYY-MM-DD.`);
  }
  return value;
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateString(value: unknown) {
  if (value instanceof Date) {
    return toDateOnly(value);
  }

  return String(value ?? '').slice(0, 10);
}

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value ?? '');
}

function readEnv(key: string) {
  return String(process.env[key] || '').trim();
}

function toInteger(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : 0;
}

function sortGa4RowsByMetric(rows: Ga4MetricRow[], metricIndex: number) {
  return [...rows].sort((left, right) => toInteger(right.metrics[metricIndex]) - toInteger(left.metrics[metricIndex]));
}

function ensureMarketingAnalyticsSchema() {
  if (!schemaReady) {
    schemaReady = withClient(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_analytics_sync_runs (
            run_id TEXT PRIMARY KEY,
            status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            ga4_property_id TEXT,
            gsc_site_url TEXT,
            started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            completed_at TIMESTAMPTZ,
            error_message TEXT
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_ga4_page_metrics (
            run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
            page_path TEXT NOT NULL,
            page_title TEXT NOT NULL DEFAULT '',
            active_users INTEGER NOT NULL DEFAULT 0,
            sessions INTEGER NOT NULL DEFAULT 0,
            screen_page_views INTEGER NOT NULL DEFAULT 0,
            event_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (run_id, page_path, page_title)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_ga4_source_metrics (
            run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
            source TEXT NOT NULL DEFAULT '',
            medium TEXT NOT NULL DEFAULT '',
            campaign TEXT NOT NULL DEFAULT '',
            active_users INTEGER NOT NULL DEFAULT 0,
            sessions INTEGER NOT NULL DEFAULT 0,
            screen_page_views INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (run_id, source, medium, campaign)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_ga4_event_metrics (
            run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
            event_name TEXT NOT NULL,
            event_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (run_id, event_name)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_gsc_query_page_metrics (
            run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
            query TEXT NOT NULL DEFAULT '',
            page TEXT NOT NULL DEFAULT '',
            clicks INTEGER NOT NULL DEFAULT 0,
            impressions INTEGER NOT NULL DEFAULT 0,
            ctr NUMERIC NOT NULL DEFAULT 0,
            position NUMERIC NOT NULL DEFAULT 0,
            PRIMARY KEY (run_id, query, page)
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_insights (
            run_id TEXT PRIMARY KEY REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
            summary JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS marketing_analytics_settings (
            id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
            excluded_sources TEXT[] NOT NULL DEFAULT ARRAY['accounts.google.com'],
            excluded_page_prefixes TEXT[] NOT NULL DEFAULT ARRAY[
              '/login',
              '/login2',
              '/sign-up',
              '/sign-up2',
              '/onboarding',
              '/onboarding2',
              '/sso-callback'
            ],
            product_page_prefixes TEXT[] NOT NULL DEFAULT ARRAY[
              '/innerbloom2',
              '/dashboard',
              '/dashboard-v3',
              '/editor'
            ],
            marketing_page_paths TEXT[] NOT NULL DEFAULT ARRAY[
              '/',
              '/v2',
              '/v3'
            ],
            internal_user_emails TEXT[] NOT NULL DEFAULT ARRAY[
              'ramagpt23@gmail.com',
              'rfullivarri22@gmail.com'
            ],
            internal_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `);
        await client.query(`
          INSERT INTO marketing_analytics_settings (id)
          VALUES (true)
          ON CONFLICT (id) DO NOTHING
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS marketing_analytics_sync_runs_completed_idx
          ON marketing_analytics_sync_runs (completed_at DESC)
          WHERE status = 'completed'
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS marketing_ga4_page_metrics_views_idx
          ON marketing_ga4_page_metrics (run_id, screen_page_views DESC)
        `);
        await client.query(`
          CREATE INDEX IF NOT EXISTS marketing_gsc_query_page_metrics_impressions_idx
          ON marketing_gsc_query_page_metrics (run_id, impressions DESC)
        `);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        schemaReady = null;
        throw error;
      }
    });
  }

  return schemaReady;
}
