-- 001_users.sql
-- Level 0 user identity mirroring schema

CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_mode') THEN
    CREATE TYPE game_mode AS ENUM ('LOW', 'CHILL', 'FLOW', 'EVOLVE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  email_primary citext NULL,
  full_name text NULL,
  image_url text NULL,
  game_mode game_mode NULL,
  weekly_target smallint GENERATED ALWAYS AS (
    CASE game_mode
      WHEN 'LOW' THEN 1
      WHEN 'CHILL' THEN 2
      WHEN 'FLOW' THEN 3
      WHEN 'EVOLVE' THEN 4
      ELSE NULL
    END
  ) STORED,
  timezone text NULL,
  locale text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz NULL,
  CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id)
);

CREATE INDEX IF NOT EXISTS users_email_primary_idx ON public.users (email_primary);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON public.users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
