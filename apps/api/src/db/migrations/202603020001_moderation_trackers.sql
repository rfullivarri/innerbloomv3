CREATE TABLE IF NOT EXISTS moderation_trackers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('alcohol', 'tobacco', 'sugar')),
  is_enabled boolean NOT NULL DEFAULT false,
  is_paused boolean NOT NULL DEFAULT false,
  not_logged_tolerance_days integer NOT NULL DEFAULT 2 CHECK (not_logged_tolerance_days >= 0),
  current_streak_days integer NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

CREATE TABLE IF NOT EXISTS moderation_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tracker_type text NOT NULL CHECK (tracker_type IN ('alcohol', 'tobacco', 'sugar')),
  day_key date NOT NULL,
  status text NOT NULL CHECK (status IN ('on_track', 'off_track', 'not_logged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tracker_type, day_key)
);

CREATE INDEX IF NOT EXISTS moderation_daily_logs_user_tracker_day_idx
  ON moderation_daily_logs (user_id, tracker_type, day_key DESC);

INSERT INTO moderation_trackers (user_id, type, is_enabled, is_paused, not_logged_tolerance_days, current_streak_days)
SELECT u.user_id, tracker.type, false, false, 2, 0
FROM users u
CROSS JOIN (VALUES ('alcohol'), ('tobacco'), ('sugar')) AS tracker(type)
ON CONFLICT (user_id, type) DO NOTHING;
