-- Ensure Daily Quest unique indexes exist (must run without a surrounding transaction)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS emotions_logs_user_date_key
  ON emotions_logs (user_id, date);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS daily_log_user_task_date_key
  ON daily_log (user_id, task_id, date);

DROP INDEX IF EXISTS ix_emotions_logs_user_date;
DROP INDEX IF EXISTS ix_daily_log_user_task_date;
