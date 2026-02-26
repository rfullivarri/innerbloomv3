BEGIN;

CREATE TABLE IF NOT EXISTS user_journey_ready_modal_views (
  user_journey_ready_modal_view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  generation_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, generation_key)
);

CREATE INDEX IF NOT EXISTS user_journey_ready_modal_views_user_seen_idx
  ON user_journey_ready_modal_views (user_id, seen_at DESC);

COMMIT;
