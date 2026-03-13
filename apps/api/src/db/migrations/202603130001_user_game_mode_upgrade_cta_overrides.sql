CREATE TABLE IF NOT EXISTS user_game_mode_upgrade_cta_overrides (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT FALSE,
  forced_current_mode varchar(50),
  forced_next_mode varchar(50),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT user_game_mode_upgrade_cta_overrides_current_mode_chk CHECK (
    forced_current_mode IS NULL OR forced_current_mode = UPPER(TRIM(forced_current_mode))
  ),
  CONSTRAINT user_game_mode_upgrade_cta_overrides_next_mode_chk CHECK (
    forced_next_mode IS NULL OR forced_next_mode = UPPER(TRIM(forced_next_mode))
  )
);

CREATE INDEX IF NOT EXISTS user_game_mode_upgrade_cta_overrides_enabled_expires_idx
  ON user_game_mode_upgrade_cta_overrides (enabled, expires_at);
