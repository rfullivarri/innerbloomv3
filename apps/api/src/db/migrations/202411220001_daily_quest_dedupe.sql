-- Daily Quest deduplication prior to unique indexes

-- Remove duplicate emotion logs, keeping the most recent created_at per (user_id, date)
DELETE FROM emotions_logs
WHERE created_at < (
  SELECT MAX(b.created_at)
    FROM emotions_logs b
   WHERE b.user_id = emotions_logs.user_id
     AND b.date = emotions_logs.date
);

-- Remove duplicate task completions, keeping the most recent created_at per (user_id, task_id, date)
DELETE FROM daily_log
WHERE created_at < (
  SELECT MAX(b.created_at)
    FROM daily_log b
   WHERE b.user_id = daily_log.user_id
     AND b.task_id = daily_log.task_id
     AND b.date = daily_log.date
);

-- Assert that no duplicates remain after cleanup
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM emotions_logs
     GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'emotions_logs still has dupes';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM daily_log
     GROUP BY user_id, task_id, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'daily_log still has dupes';
  END IF;
END
$$;
