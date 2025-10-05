BEGIN;
-- Development seeds for quick demos
INSERT INTO pillars (id, name, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Body', 'Care for your physical self'),
    ('22222222-2222-2222-2222-222222222222', 'Mind', 'Grow your brilliant brain'),
    ('33333333-3333-3333-3333-333333333333', 'Soul', 'Nurture your heart')
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description;

INSERT INTO traits (id, pillar_id, name)
VALUES
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Energy'),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Focus'),
    ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Calm')
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        pillar_id = EXCLUDED.pillar_id;

INSERT INTO stats (id, trait_id, name, unit)
VALUES
    ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Steps', 'count'),
    ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Deep Work Minutes', 'minutes'),
    ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'Mindfulness Minutes', 'minutes')
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        unit = EXCLUDED.unit,
        trait_id = EXCLUDED.trait_id;

INSERT INTO users (id, email, display_name, avatar_url)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'demo@innerbloom.test', 'Demo Explorer', 'https://avatars.githubusercontent.com/u/000?v=4')
ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url;

INSERT INTO tasks (id, user_id, name, description, weekly_target, xp, pillar_id, trait_id, stat_id)
VALUES
    ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000001', 'Morning Stretch', 'Stretch tall for five minutes.', 3, 15, '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777'),
    ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '00000000-0000-0000-0000-000000000001', 'Focus Sprint', 'Twenty minutes of deep work.', 4, 20, '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888'),
    ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '00000000-0000-0000-0000-000000000001', 'Evening Reflection', 'Three mindful breaths + journal.', 2, 12, '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999')
ON CONFLICT (id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        weekly_target = EXCLUDED.weekly_target,
        xp = EXCLUDED.xp,
        pillar_id = EXCLUDED.pillar_id,
        trait_id = EXCLUDED.trait_id,
        stat_id = EXCLUDED.stat_id;

WITH base AS (
    SELECT date_trunc('week', now())::date AS current_week
)
INSERT INTO task_logs (id, user_id, task_id, done_at)
VALUES
    ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '00000000-0000-0000-0000-000000000001', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', (SELECT current_week - INTERVAL '21 days' + INTERVAL '1 day' FROM base)),
    ('bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '00000000-0000-0000-0000-000000000001', 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', (SELECT current_week - INTERVAL '14 days' + INTERVAL '2 days' FROM base)),
    ('bbbbbbb3-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '00000000-0000-0000-0000-000000000001', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', (SELECT current_week - INTERVAL '14 days' + INTERVAL '3 days' FROM base)),
    ('bbbbbbb4-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '00000000-0000-0000-0000-000000000001', 'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', (SELECT current_week - INTERVAL '7 days' + INTERVAL '1 day' FROM base)),
    ('bbbbbbb5-bbbb-bbbb-bbbb-bbbbbbbbbbb5', '00000000-0000-0000-0000-000000000001', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', (SELECT current_week - INTERVAL '7 days' + INTERVAL '2 days' FROM base)),
    ('bbbbbbb6-bbbb-bbbb-bbbb-bbbbbbbbbbb6', '00000000-0000-0000-0000-000000000001', 'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', (SELECT current_week + INTERVAL '1 day' FROM base))
ON CONFLICT (id) DO NOTHING;

COMMIT;
