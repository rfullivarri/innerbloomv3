BEGIN;
-- Pillars → Traits → Stats scaffolding
CREATE TABLE IF NOT EXISTS pillars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pillars_name_idx ON pillars (name);

CREATE TABLE IF NOT EXISTS traits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pillar_id UUID NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traits_pillar_id_idx ON traits (pillar_id);

CREATE TABLE IF NOT EXISTS stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trait_id UUID NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stats_trait_id_idx ON stats (trait_id);

-- Users & profile metadata
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Ensure optional avatar column exists when table predates migration
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Tasks owned by users
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weekly_target INTEGER NOT NULL DEFAULT 1,
    xp SMALLINT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill legacy schemas with new columns
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS weekly_target INTEGER,
    ADD COLUMN IF NOT EXISTS xp SMALLINT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE tasks SET name = COALESCE(name, title) WHERE name IS NULL;
UPDATE tasks SET weekly_target = 1 WHERE weekly_target IS NULL;
UPDATE tasks SET xp = 10 WHERE xp IS NULL;

ALTER TABLE tasks
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN weekly_target SET NOT NULL,
    ALTER COLUMN weekly_target SET DEFAULT 1,
    ALTER COLUMN xp SET NOT NULL,
    ALTER COLUMN xp SET DEFAULT 10,
    ALTER COLUMN created_at SET DEFAULT now();

-- Preserve optional relations if legacy columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'tasks' AND constraint_name = 'tasks_user_id_fkey'
    ) THEN
        ALTER TABLE tasks
            ADD COLUMN IF NOT EXISTS user_id UUID,
            ALTER COLUMN user_id SET NOT NULL,
            ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Attach pillar/trait/stat references when tables exist
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS pillar_id UUID REFERENCES pillars(id) ON DELETE SET NULL;
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS trait_id UUID REFERENCES traits(id) ON DELETE SET NULL;
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS stat_id UUID REFERENCES stats(id) ON DELETE SET NULL;
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);
CREATE INDEX IF NOT EXISTS tasks_pillar_id_idx ON tasks (pillar_id);
CREATE INDEX IF NOT EXISTS tasks_trait_id_idx ON tasks (trait_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_weekly_target_idx ON tasks (user_id, weekly_target);

-- Task logs for completions
CREATE TABLE IF NOT EXISTS task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_logs
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE task_logs
    ALTER COLUMN done_at SET NOT NULL,
    ALTER COLUMN done_at SET DEFAULT now();

CREATE INDEX IF NOT EXISTS task_logs_user_task_done_at_idx ON task_logs (user_id, task_id, done_at);
CREATE INDEX IF NOT EXISTS task_logs_task_id_idx ON task_logs (task_id);
CREATE INDEX IF NOT EXISTS task_logs_user_id_idx ON task_logs (user_id);

COMMIT;
