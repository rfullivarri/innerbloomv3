BEGIN;
-- Enumerations and progression scaffolding
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pillar_type') THEN
        CREATE TYPE pillar_type AS ENUM ('BODY', 'MIND', 'SOUL');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS level_rules (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL UNIQUE
);

INSERT INTO level_rules (level, xp_required)
VALUES
    (1, 0),
    (2, 100),
    (3, 250),
    (4, 450),
    (5, 700),
    (6, 1000),
    (7, 1350),
    (8, 1750),
    (9, 2200),
    (10, 2800)
ON CONFLICT (level) DO NOTHING;

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievements_code_idx ON achievements (code);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_code TEXT NOT NULL REFERENCES achievements(code),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, achievement_code)
);

COMMIT;
