CREATE TABLE IF NOT EXISTS user_product_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
  weekly_wrapped_enabled boolean NOT NULL DEFAULT false,
  growth_calibration_enabled boolean NOT NULL DEFAULT false,
  monthly_wrapped_enabled boolean NOT NULL DEFAULT false,
  habit_achievement_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_product_notification_preferences_updated_at_idx
  ON user_product_notification_preferences (updated_at DESC);
