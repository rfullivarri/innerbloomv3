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
);

CREATE TABLE IF NOT EXISTS marketing_ga4_page_metrics (
  run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT NOT NULL DEFAULT '',
  active_users INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  screen_page_views INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, page_path, page_title)
);

CREATE TABLE IF NOT EXISTS marketing_ga4_source_metrics (
  run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT '',
  medium TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '',
  active_users INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  screen_page_views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, source, medium, campaign)
);

CREATE TABLE IF NOT EXISTS marketing_ga4_event_metrics (
  run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, event_name)
);

CREATE TABLE IF NOT EXISTS marketing_gsc_query_page_metrics (
  run_id TEXT NOT NULL REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
  query TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  position NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, query, page)
);

CREATE TABLE IF NOT EXISTS marketing_insights (
  run_id TEXT PRIMARY KEY REFERENCES marketing_analytics_sync_runs(run_id) ON DELETE CASCADE,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_analytics_sync_runs_completed_idx
  ON marketing_analytics_sync_runs (completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS marketing_ga4_page_metrics_views_idx
  ON marketing_ga4_page_metrics (run_id, screen_page_views DESC);

CREATE INDEX IF NOT EXISTS marketing_gsc_query_page_metrics_impressions_idx
  ON marketing_gsc_query_page_metrics (run_id, impressions DESC);
