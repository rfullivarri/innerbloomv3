CREATE TABLE IF NOT EXISTS user_journey_generation_state (
  user_id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  correlation_id uuid,
  completed_at timestamp with time zone,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_journey_generation_state_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_journey_generation_state_status_idx
  ON user_journey_generation_state (status);

CREATE INDEX IF NOT EXISTS user_journey_generation_state_updated_at_idx
  ON user_journey_generation_state (updated_at DESC);
