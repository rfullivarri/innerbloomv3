CREATE TABLE IF NOT EXISTS user_game_mode_history (
  user_game_mode_history_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  game_mode_id integer NOT NULL REFERENCES cat_game_mode(game_mode_id),
  effective_at timestamp with time zone NOT NULL DEFAULT NOW(),
  source text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_game_mode_history_user_effective_idx
  ON user_game_mode_history (user_id, effective_at DESC);

INSERT INTO user_game_mode_history (user_id, game_mode_id, effective_at, source)
SELECT u.user_id,
       u.game_mode_id,
       COALESCE(u.updated_at, NOW()),
       'migration_baseline'
  FROM users u
 WHERE u.game_mode_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1
       FROM user_game_mode_history h
      WHERE h.user_id = u.user_id
   );

CREATE OR REPLACE FUNCTION sync_user_game_mode_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.game_mode_id IS DISTINCT FROM OLD.game_mode_id AND NEW.game_mode_id IS NOT NULL THEN
    INSERT INTO user_game_mode_history (user_id, game_mode_id, effective_at, source)
    VALUES (NEW.user_id, NEW.game_mode_id, NOW(), 'users_update_trigger');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_game_mode_history ON users;
CREATE TRIGGER trg_users_game_mode_history
AFTER UPDATE OF game_mode_id ON users
FOR EACH ROW
EXECUTE FUNCTION sync_user_game_mode_history();

CREATE TABLE IF NOT EXISTS task_difficulty_recalibrations (
  task_difficulty_recalibration_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  game_mode_id integer NOT NULL REFERENCES cat_game_mode(game_mode_id),
  expected_target numeric(10,2) NOT NULL,
  completions_done integer NOT NULL,
  completion_rate numeric(10,4) NOT NULL,
  previous_difficulty_id integer NOT NULL REFERENCES cat_difficulty(difficulty_id),
  new_difficulty_id integer NOT NULL REFERENCES cat_difficulty(difficulty_id),
  action text NOT NULL CHECK (action IN ('up', 'keep', 'down')),
  analyzed_at timestamp with time zone NOT NULL DEFAULT NOW(),
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  CONSTRAINT task_difficulty_recalibration_period_chk CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS task_difficulty_recalibrations_task_analyzed_idx
  ON task_difficulty_recalibrations (task_id, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS task_difficulty_recalibrations_task_period_idx
  ON task_difficulty_recalibrations (task_id, period_end DESC);
