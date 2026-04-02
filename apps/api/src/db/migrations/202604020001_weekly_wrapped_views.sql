BEGIN;

CREATE TABLE IF NOT EXISTS weekly_wrapped_views (
  weekly_wrapped_view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  weekly_wrapped_id uuid NOT NULL REFERENCES weekly_wrapped(weekly_wrapped_id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, weekly_wrapped_id)
);

CREATE INDEX IF NOT EXISTS weekly_wrapped_views_user_seen_idx
  ON weekly_wrapped_views (user_id, seen_at DESC);

COMMIT;
