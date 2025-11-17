-- User daily reminders infrastructure

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_daily_reminders (
  user_daily_reminder_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'active',
  timezone text NOT NULL DEFAULT 'UTC',
  local_time time without time zone NOT NULL,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_daily_reminders_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_daily_reminders_user_channel_key
  ON user_daily_reminders (user_id, channel);

CREATE INDEX IF NOT EXISTS user_daily_reminders_status_channel_idx
  ON user_daily_reminders (status, channel);
