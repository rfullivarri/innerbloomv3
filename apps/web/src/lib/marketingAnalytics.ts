import { apiAuthorizedFetch } from './api';

export type MarketingAnalyticsRun = {
  runId: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  ga4PropertyId: string | null;
  gscSiteUrl: string | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type MarketingAnalyticsTotals = {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  events: number;
  searchClicks: number;
  searchImpressions: number;
};

export type MarketingPageTotals = {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  events: number;
};

export type MarketingAnalyticsSummary = {
  runId: string;
  periodStart: string;
  periodEnd: string;
  totals: MarketingAnalyticsTotals;
  rawTotals?: MarketingAnalyticsTotals;
  marketingTotals?: MarketingPageTotals;
  productTotals?: MarketingPageTotals;
  registeredUsers?: MarketingRegisteredUserStats;
  highlights: string[];
  notes?: string[];
};

export type MarketingAnalyticsSettings = {
  excludedSources: string[];
  excludedPagePrefixes: string[];
  productPagePrefixes: string[];
  marketingPagePaths: string[];
  internalUserEmails: string[];
  internalUserIds: string[];
};

export type MarketingRegisteredUserStats = {
  total: number;
  newInPeriod: number;
  excludedInternal: number;
};

export type MarketingPageMetric = {
  page_path: string;
  page_title: string;
  active_users: number;
  sessions: number;
  screen_page_views: number;
  event_count: number;
};

export type MarketingSourceMetric = {
  source: string;
  medium: string;
  campaign: string;
  active_users: number;
  sessions: number;
  screen_page_views: number;
};

export type MarketingAnalyticsInsights = {
  ok: boolean;
  configured: boolean;
  missing: string[];
  latestRun: MarketingAnalyticsRun | null;
  settings: MarketingAnalyticsSettings;
  summary: MarketingAnalyticsSummary | null;
  registeredUsers: MarketingRegisteredUserStats | null;
  topPages: MarketingPageMetric[];
  topSources: MarketingSourceMetric[];
  marketingPages: MarketingPageMetric[];
  productPages: MarketingPageMetric[];
  cleanSources: MarketingSourceMetric[];
  topEvents: Array<{
    event_name: string;
    event_count: number;
  }>;
  topQueries: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
};

export type MarketingAnalyticsSyncResult = {
  ok: boolean;
  runId: string;
  periodStart: string;
  periodEnd: string;
  rows: {
    ga4Pages: number;
    ga4Sources: number;
    ga4Events: number;
    gscQueries: number;
  };
  summary: MarketingAnalyticsSummary;
};

export async function fetchMarketingAnalyticsInsights() {
  const response = await apiAuthorizedFetch('/admin/marketing/analytics/insights', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Marketing analytics request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<MarketingAnalyticsInsights>;
}

export async function syncMarketingAnalytics() {
  const response = await apiAuthorizedFetch('/admin/marketing/analytics/sync', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Marketing analytics sync failed with HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<MarketingAnalyticsSyncResult>;
}

export async function updateMarketingAnalyticsSettings(settings: Partial<MarketingAnalyticsSettings>) {
  const response = await apiAuthorizedFetch('/admin/marketing/analytics/settings', {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Marketing analytics settings failed with HTTP ${response.status}: ${body}`);
  }

  return response.json() as Promise<{ ok: boolean; settings: MarketingAnalyticsSettings }>;
}
