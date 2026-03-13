ALTER TABLE user_game_mode_upgrade_suggestions
  DROP CONSTRAINT IF EXISTS user_game_mode_upgrade_suggestions_period_key_chk;

ALTER TABLE user_game_mode_upgrade_suggestions
  ADD CONSTRAINT user_game_mode_upgrade_suggestions_period_key_chk
  CHECK (
    period_key = 'debug_forced'
    OR period_key ~ '^rolling_\d{4}-\d{2}-\d{2}$'
    OR period_key ~ '^\d{4}-\d{2}$'
  );
