ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_tasks_confirmed_at timestamp with time zone;

UPDATE users
   SET first_tasks_confirmed_at = COALESCE(first_tasks_confirmed_at, updated_at, created_at, now())
 WHERE first_tasks_confirmed = TRUE
   AND first_tasks_confirmed_at IS NULL;
