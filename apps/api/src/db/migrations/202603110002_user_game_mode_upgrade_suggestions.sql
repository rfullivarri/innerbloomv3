CREATE TABLE IF NOT EXISTS user_game_mode_upgrade_suggestions (
  user_game_mode_upgrade_suggestion_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  period_key text NOT NULL,
  current_game_mode_id integer NOT NULL REFERENCES cat_game_mode(game_mode_id),
  suggested_game_mode_id integer NULL REFERENCES cat_game_mode(game_mode_id),
  eligible_for_upgrade boolean NOT NULL,
  accepted_at timestamp with time zone NULL,
  dismissed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT user_game_mode_upgrade_suggestions_period_key_chk CHECK (period_key ~ '^\d{4}-\d{2}$'),
  CONSTRAINT user_game_mode_upgrade_suggestions_unique UNIQUE (user_id, period_key, current_game_mode_id)
);

CREATE INDEX IF NOT EXISTS user_game_mode_upgrade_suggestions_user_period_idx
  ON user_game_mode_upgrade_suggestions (user_id, period_key DESC, created_at DESC);
