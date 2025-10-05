-- Ensure required extensions exist (idempotent)
CREATE EXTENSION IF NOT EXISTS citext;

DO $$
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pgcrypto';
  EXCEPTION
    WHEN undefined_file THEN
      BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"';
      EXCEPTION
        WHEN undefined_file THEN
          RAISE NOTICE 'Neither pgcrypto nor uuid-ossp extension could be created.';
      END;
  END;
END;
$$;


DO $m$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'game_mode'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'game_mode'
        AND e.enumlabel = 'LOW'
    ) THEN
      EXECUTE 'ALTER TYPE game_mode ADD VALUE ''LOW''';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'game_mode'
        AND e.enumlabel = 'CHILL'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'game_mode'
          AND e.enumlabel = 'LOW'
      ) THEN
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''CHILL'' AFTER ''LOW''';
      ELSE
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''CHILL''';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'game_mode'
        AND e.enumlabel = 'FLOW'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'game_mode'
          AND e.enumlabel = 'CHILL'
      ) THEN
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''FLOW'' AFTER ''CHILL''';
      ELSE
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''FLOW''';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'game_mode'
        AND e.enumlabel = 'EVOLVE'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'game_mode'
          AND e.enumlabel = 'FLOW'
      ) THEN
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''EVOLVE'' AFTER ''FLOW''';
      ELSE
        EXECUTE 'ALTER TYPE game_mode ADD VALUE ''EVOLVE''';
      END IF;
    END IF;
  END IF;
END;
$m$;

-- Canonical enum for game modes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'game_mode'
  ) THEN
    EXECUTE $$CREATE TYPE game_mode AS ENUM ('LOW','CHILL','FLOW','EVOLVE')$$;
  END IF;
END;
$$;

ALTER TYPE game_mode ADD VALUE IF NOT EXISTS 'LOW';
ALTER TYPE game_mode ADD VALUE IF NOT EXISTS 'CHILL';
ALTER TYPE game_mode ADD VALUE IF NOT EXISTS 'FLOW';
ALTER TYPE game_mode ADD VALUE IF NOT EXISTS 'EVOLVE';

-- Users table (first table in the database)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = 'gen_random_uuid'
        AND pg_function_is_visible(oid)
    ) THEN
      EXECUTE $$
        CREATE TABLE public.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clerk_user_id TEXT UNIQUE NOT NULL,
          email_primary CITEXT NULL,
          full_name TEXT NULL,
          image_url TEXT NULL,
          game_mode game_mode NULL DEFAULT NULL,
          weekly_target SMALLINT GENERATED ALWAYS AS (
            CASE game_mode
              WHEN 'LOW' THEN 1
              WHEN 'CHILL' THEN 2
              WHEN 'FLOW' THEN 3
              WHEN 'EVOLVE' THEN 4
              ELSE NULL
            END
          ) STORED,
          timezone TEXT NULL,
          locale TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          deleted_at TIMESTAMPTZ NULL
        )
      $$;
    ELSE
      EXECUTE $$
        CREATE TABLE public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          clerk_user_id TEXT UNIQUE NOT NULL,
          email_primary CITEXT NULL,
          full_name TEXT NULL,
          image_url TEXT NULL,
          game_mode game_mode NULL DEFAULT NULL,
          weekly_target SMALLINT GENERATED ALWAYS AS (
            CASE game_mode
              WHEN 'LOW' THEN 1
              WHEN 'CHILL' THEN 2
              WHEN 'FLOW' THEN 3
              WHEN 'EVOLVE' THEN 4
              ELSE NULL
            END
          ) STORED,
          timezone TEXT NULL,
          locale TEXT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          deleted_at TIMESTAMPTZ NULL
        )
      $$;
    END IF;
  END IF;
END;
$$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_primary CITEXT NULL,
  ADD COLUMN IF NOT EXISTS full_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS game_mode game_mode NULL,
  ADD COLUMN IF NOT EXISTS weekly_target SMALLINT GENERATED ALWAYS AS (
    CASE game_mode
      WHEN 'LOW' THEN 1
      WHEN 'CHILL' THEN 2
      WHEN 'FLOW' THEN 3
      WHEN 'EVOLVE' THEN 4
      ELSE NULL
    END
  ) STORED,
  ADD COLUMN IF NOT EXISTS timezone TEXT NULL,
  ADD COLUMN IF NOT EXISTS locale TEXT NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_primary ON public.users (email_primary);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
