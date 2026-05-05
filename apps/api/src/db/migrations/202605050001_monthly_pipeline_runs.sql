CREATE TABLE IF NOT EXISTS monthly_pipeline_runs (
  monthly_pipeline_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text UNIQUE NOT NULL,
  period_start date NOT NULL,
  next_period_start date NOT NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz NULL,
  completed_at timestamptz NULL,
  stage text NULL,
  last_error text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_pipeline_runs_period_key_chk CHECK (period_key ~ '^\\d{4}-\\d{2}$'),
  CONSTRAINT monthly_pipeline_runs_status_chk CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'partial'))
);

CREATE INDEX IF NOT EXISTS monthly_pipeline_runs_status_updated_idx
  ON monthly_pipeline_runs (status, updated_at DESC);
