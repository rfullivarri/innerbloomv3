ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pending_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS excluded_from_growth_calibration boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluded_from_mode_upgrade boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS excluded_from_habit_achievement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS difficulty_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS achievement_seal_visible boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'tasks_lifecycle_status_chk'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_lifecycle_status_chk
      CHECK (lifecycle_status IN ('active', 'achievement_pending', 'achievement_maintained', 'achievement_stored'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS task_habit_achievements (
  task_habit_achievement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending_decision', 'maintained', 'stored', 'expired_pending')),
  detected_at timestamp with time zone NOT NULL,
  pending_expires_at timestamp with time zone,
  detected_period_end date NOT NULL,
  window_months integer NOT NULL,
  aggregated_expected_target numeric(10,2) NOT NULL,
  aggregated_completions_done integer NOT NULL,
  aggregated_completion_rate numeric(10,4) NOT NULL,
  months_evaluated integer NOT NULL,
  months_meeting_goal integer NOT NULL,
  months_below_floor integer NOT NULL,
  decision_made_at timestamp with time zone,
  gp_generated_until_achievement integer NOT NULL DEFAULT 0,
  gp_generated_since_maintain integer NOT NULL DEFAULT 0,
  shelf_pillar_id smallint,
  shelf_trait_id smallint,
  task_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_habit_achievements_task_detected_idx
  ON task_habit_achievements (task_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS task_habit_achievements_user_status_idx
  ON task_habit_achievements (user_id, status, detected_at DESC);

CREATE INDEX IF NOT EXISTS task_habit_achievements_pending_expires_idx
  ON task_habit_achievements (status, pending_expires_at)
  WHERE status = 'pending_decision';
