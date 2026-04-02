DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'task_difficulty_recalibrations_source_chk'
  ) THEN
    ALTER TABLE task_difficulty_recalibrations
      DROP CONSTRAINT task_difficulty_recalibrations_source_chk;
  END IF;

  ALTER TABLE task_difficulty_recalibrations
    ADD CONSTRAINT task_difficulty_recalibrations_source_chk
    CHECK (source IN ('cron', 'admin_run', 'admin_monthly_backfill'));
END;
$$;
