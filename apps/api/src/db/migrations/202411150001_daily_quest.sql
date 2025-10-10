-- Daily Quest v1 migration: ensure FK relationships and uniqueness for daily submissions

-- Ensure users.tasks_group_id references tasks_group(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'users_tasks_group_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_tasks_group_id_fkey
      FOREIGN KEY (tasks_group_id)
      REFERENCES tasks_group(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Ensure tasks.tasks_group_id column exists and references tasks_group(id)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS tasks_group_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'tasks_tasks_group_id_fkey'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_tasks_group_id_fkey
      FOREIGN KEY (tasks_group_id)
      REFERENCES tasks_group(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END
$$;

-- Backfill tasks_group_id for tasks using their owner mapping when missing
UPDATE tasks t
   SET tasks_group_id = u.tasks_group_id
  FROM users u
 WHERE u.user_id = t.user_id
   AND t.tasks_group_id IS NULL
   AND u.tasks_group_id IS NOT NULL;

-- Keep the column non-null when data exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'tasks_group_id') THEN
    BEGIN
      ALTER TABLE tasks
        ALTER COLUMN tasks_group_id SET NOT NULL;
    EXCEPTION
      WHEN others THEN
        -- Ignore failures (likely due to orphan rows) to preserve idempotency
        NULL;
    END;
  END IF;
END
$$;

-- Optional notes column for emotions logs submissions
ALTER TABLE emotions_logs
  ADD COLUMN IF NOT EXISTS notes text;

-- Unique constraints for daily submissions
CREATE UNIQUE INDEX IF NOT EXISTS emotions_logs_user_date_key
    ON emotions_logs (user_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS daily_log_user_task_date_key
    ON daily_log (user_id, task_id, date);
