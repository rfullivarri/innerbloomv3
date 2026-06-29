import { randomUUID } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
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

let cachedGoogleToken: GoogleAccessToken | null = null;
let schemaReady: Promise<void> | null = null;

export type MarketingAnalyticsSyncOptions = Partial<DateRange> & {
  force?: boolean;
};

export async function getMarketingAnalyticsStatus() {
  await ensureMarketingAnalyticsSchema();
  const config = getMarketingAnalyticsConfig();
  const latestRun = await getLatestRun();

  return {
    configured: config.configured,
    missing: config.missing,
    ga4PropertyId: config.ga4PropertyId || null,
    gscSiteUrl: config.gscSiteUrl || null,
    latestRun,
  };
}

export async function getMarketingAnalyticsInsights() {
  await ensureMarketingAnalyticsSchema();
  const config = getMarketingAnalyticsConfig();
  const latestRun = await getLatestRun();

  if (!latestRun || latestRun.status !== 'completed') {
    return {
      configured: config.configured,
      missing: config.missing,
      latestRun,
      summary: null,
      topPages: [],
      topSources: [],
      topEvents: [],
      topQueries: [],
    };
  }

  const [insightResult, pageResult, sourceResult, eventResult, queryResult] = await Promise.all([
    pool.query<{ summary: unknown }>('SELECT summary FROM marketing_insights WHERE run_id = $1 LIMIT 1', [latestRun.runId]),
    pool.query(
      `SELECT page_path, page_title, active_users, sessions, screen_page_views, event_count
       FROM marketing_ga4_page_metrics
       WHERE run_id = $1
       ORDER BY screen_page_views DESC, active_users DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
    pool.query(
      `SELECT source, medium, campaign, active_users, sessions, screen_page_views
       FROM marketing_ga4_source_metrics
       WHERE run_id = $1
       ORDER BY sessions DESC, active_users DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
    pool.query(
      `SELECT event_name, event_count
       FROM marketing_ga4_event_metrics
       WHERE run_id = $1
       ORDER BY event_count DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
    pool.query(
      `SELECT query, page, clicks, impressions, ctr::float AS ctr, position::float AS position
       FROM marketing_gsc_query_page_metrics
       WHERE run_id = $1
       ORDER BY impressions DESC, clicks DESC
       LIMIT 10`,
      [latestRun.runId],
    ),
  ]);

  return {
    configured: config.configured,
    missing: config.missing,
    latestRun,
    summary: insightResult.rows[0]?.summary ?? null,
    topPages: pageResult.rows,
    topSources: sourceResult.rows,
    topEvents: eventResult.rows,
    topQueries: queryResult.rows,
  };
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
    const [ga4Pages, ga4Sources, ga4Events, gscQueries] = await Promise.all([
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
      ga4Pages,
      ga4Sources,
      ga4Events,
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
  ga4Pages,
  ga4Sources,
  ga4Events,
  gscQueries,
}: {
  runId: string;
  dateRange: DateRange;
  ga4Pages: Ga4MetricRow[];
  ga4Sources: Ga4MetricRow[];
  ga4Events: Ga4MetricRow[];
  gscQueries: GscMetricRow[];
}) {
  const totals = {
    activeUsers: sumMetric(ga4Pages, 0),
    sessions: sumMetric(ga4Pages, 1),
    pageViews: sumMetric(ga4Pages, 2),
    events: sumMetric(ga4Events, 0),
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
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: '100',
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(response.status, 'ga4_request_failed', 'GA4 Data API request failed.', body);
  }

  return (Array.isArray(body?.rows) ? body.rows : []).map((row: any) => ({
    dimensions: Array.isArray(row.dimensionValues)
      ? row.dimensionValues.map((value: any) => String(value?.value ?? ''))
      : [],
    metrics: Array.isArray(row.metricValues)
      ? row.metricValues.map((value: any) => Number(value?.value ?? 0))
      : [],
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

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(response.status, 'gsc_request_failed', 'Search Console API request failed.', body);
  }

  return (Array.isArray(body?.rows) ? body.rows : []).map((row: any) => ({
    keys: Array.isArray(row.keys) ? row.keys.map((value: unknown) => String(value ?? '')) : [],
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    ctr: Number(row.ctr ?? 0),
    position: Number(row.position ?? 0),
  }));
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

function sumMetric(rows: Ga4MetricRow[], metricIndex: number) {
  return rows.reduce((total, row) => total + toInteger(row.metrics[metricIndex]), 0);
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
