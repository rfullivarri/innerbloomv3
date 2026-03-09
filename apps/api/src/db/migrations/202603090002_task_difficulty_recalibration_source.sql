ALTER TABLE task_difficulty_recalibrations
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'cron';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_difficulty_recalibrations_source_chk'
  ) THEN
    ALTER TABLE task_difficulty_recalibrations
      ADD CONSTRAINT task_difficulty_recalibrations_source_chk
      CHECK (source IN ('cron', 'admin_run'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS task_difficulty_recalibrations_source_analyzed_idx
  ON task_difficulty_recalibrations (source, analyzed_at DESC);
