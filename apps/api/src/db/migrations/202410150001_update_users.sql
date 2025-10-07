ALTER TABLE users
  ALTER COLUMN user_id SET DEFAULT gen_random_uuid();

ALTER TABLE users
  ALTER COLUMN clerk_user_id SET NOT NULL;

ALTER TABLE users
  ALTER COLUMN created_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_user_id_key ON users (clerk_user_id);
