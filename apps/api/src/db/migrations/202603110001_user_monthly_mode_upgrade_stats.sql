CREATE TABLE IF NOT EXISTS user_monthly_mode_upgrade_stats (
  user_monthly_mode_upgrade_stat_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  period_key text NOT NULL,
  game_mode_id integer NOT NULL REFERENCES cat_game_mode(game_mode_id),
  tasks_total_evaluated integer NOT NULL CHECK (tasks_total_evaluated >= 0),
  tasks_meeting_goal integer NOT NULL CHECK (tasks_meeting_goal >= 0),
  task_pass_rate numeric(10,4) NOT NULL CHECK (task_pass_rate >= 0),
  eligible_for_upgrade boolean NOT NULL,
  next_game_mode_id integer NULL REFERENCES cat_game_mode(game_mode_id),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT user_monthly_mode_upgrade_stats_period_key_chk CHECK (period_key ~ '^\\d{4}-\\d{2}$'),
  CONSTRAINT user_monthly_mode_upgrade_stats_counts_chk CHECK (tasks_meeting_goal <= tasks_total_evaluated),
  CONSTRAINT user_monthly_mode_upgrade_stats_unique UNIQUE (user_id, period_key, game_mode_id)
);

CREATE INDEX IF NOT EXISTS user_monthly_mode_upgrade_stats_period_idx
  ON user_monthly_mode_upgrade_stats (period_key, user_id);

CREATE INDEX IF NOT EXISTS user_monthly_mode_upgrade_stats_user_period_idx
  ON user_monthly_mode_upgrade_stats (user_id, period_key DESC, updated_at DESC);
