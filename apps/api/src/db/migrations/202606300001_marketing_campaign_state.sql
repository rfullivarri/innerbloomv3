CREATE TABLE IF NOT EXISTS marketing_campaigns (
  marketing_campaign_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  campaign_code text NOT NULL UNIQUE,
  title text NOT NULL,
  objective text NOT NULL DEFAULT 'new_users' CHECK (objective IN ('new_users', 'leads', 'activation', 'awareness', 'retention')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'completed', 'archived')),
  strategy_summary text NOT NULL DEFAULT '',
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  published_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketing_posts (
  marketing_post_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_campaign_id uuid NOT NULL REFERENCES marketing_campaigns(marketing_campaign_id) ON DELETE CASCADE,
  post_code text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  format text NOT NULL CHECK (format IN ('carousel', 'static', 'reel', 'story', 'thread', 'short_video')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'needs_review', 'approved', 'rejected', 'published', 'measured', 'archived')),
  hook text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  hypothesis text NOT NULL DEFAULT '',
  target_metric text NOT NULL DEFAULT '',
  tracking_url text NOT NULL DEFAULT '',
  asset_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  agent_notes text NOT NULL DEFAULT '',
  decision_note text NOT NULL DEFAULT '',
  rejection_reason text NOT NULL DEFAULT '',
  scheduled_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  published_at timestamptz,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketing_campaign_id, post_code)
);

CREATE TABLE IF NOT EXISTS marketing_post_metrics (
  marketing_post_metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_post_id uuid NOT NULL REFERENCES marketing_posts(marketing_post_id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('ga4', 'gsc', 'metricool_manual', 'manual')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  impressions integer NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  reach integer NOT NULL DEFAULT 0 CHECK (reach >= 0),
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  sessions integer NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  landing_cta_clicks integer NOT NULL DEFAULT 0 CHECK (landing_cta_clicks >= 0),
  signups integer NOT NULL DEFAULT 0 CHECK (signups >= 0),
  dashboard_views integer NOT NULL DEFAULT 0 CHECK (dashboard_views >= 0),
  leads integer NOT NULL DEFAULT 0 CHECK (leads >= 0),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketing_post_id, source, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS marketing_learnings (
  marketing_learning_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_campaign_id uuid REFERENCES marketing_campaigns(marketing_campaign_id) ON DELETE SET NULL,
  period_key text NOT NULL CHECK (period_key ~ '^\d{4}-\d{2}$'),
  learning_stage text NOT NULL DEFAULT 'pre_next_generation' CHECK (learning_stage IN ('pre_next_generation', 'monthly_close', 'manual_note')),
  has_metrics boolean NOT NULL DEFAULT false,
  summary text NOT NULL DEFAULT '',
  winning_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  losing_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  agent_context_summary text NOT NULL DEFAULT '',
  source_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_period_idx
  ON marketing_campaigns (period_key DESC, status);

CREATE INDEX IF NOT EXISTS marketing_posts_campaign_status_idx
  ON marketing_posts (marketing_campaign_id, status);

CREATE INDEX IF NOT EXISTS marketing_posts_tracking_url_idx
  ON marketing_posts (tracking_url)
  WHERE tracking_url <> '';

CREATE INDEX IF NOT EXISTS marketing_post_metrics_post_period_idx
  ON marketing_post_metrics (marketing_post_id, period_start DESC, period_end DESC);

CREATE INDEX IF NOT EXISTS marketing_learnings_period_stage_idx
  ON marketing_learnings (period_key DESC, learning_stage);
