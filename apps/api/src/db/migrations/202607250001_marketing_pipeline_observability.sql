CREATE TABLE IF NOT EXISTS marketing_pipeline_runs (
  marketing_pipeline_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text NOT NULL CHECK (period_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  branch_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'waiting', 'running', 'completed', 'failed', 'blocked', 'skipped')),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_key, attempt)
);

CREATE TABLE IF NOT EXISTS marketing_pipeline_stages (
  marketing_pipeline_stage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_pipeline_run_id uuid NOT NULL REFERENCES marketing_pipeline_runs(marketing_pipeline_run_id) ON DELETE CASCADE,
  stage_key text NOT NULL CHECK (stage_key IN (
    'cmo_context',
    'cmo_agent',
    'content_context',
    'head_of_content_agent',
    'creative_context',
    'creative_director_agent',
    'preview_render',
    'full_render_admin'
  )),
  position integer NOT NULL CHECK (position BETWEEN 1 AND 8),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'waiting', 'running', 'completed', 'failed', 'blocked', 'skipped')),
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  input_path text,
  output_path text,
  input_sha256 text CHECK (input_sha256 IS NULL OR input_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  output_sha256 text CHECK (output_sha256 IS NULL OR output_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  execution_kind text NOT NULL CHECK (execution_kind IN ('github_action', 'codex_agent', 'human_review')),
  execution_reference text,
  summary text NOT NULL DEFAULT '',
  error_message text NOT NULL DEFAULT '',
  log_excerpt text NOT NULL DEFAULT '',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketing_pipeline_run_id, stage_key, attempt)
);

CREATE TABLE IF NOT EXISTS marketing_pipeline_events (
  marketing_pipeline_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_pipeline_run_id uuid NOT NULL REFERENCES marketing_pipeline_runs(marketing_pipeline_run_id) ON DELETE CASCADE,
  marketing_pipeline_stage_id uuid REFERENCES marketing_pipeline_stages(marketing_pipeline_stage_id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_pipeline_runs_period_idx
  ON marketing_pipeline_runs (period_key DESC, attempt DESC);

CREATE INDEX IF NOT EXISTS marketing_pipeline_stages_run_position_idx
  ON marketing_pipeline_stages (marketing_pipeline_run_id, position, attempt DESC);

CREATE INDEX IF NOT EXISTS marketing_pipeline_events_run_created_idx
  ON marketing_pipeline_events (marketing_pipeline_run_id, created_at DESC);
