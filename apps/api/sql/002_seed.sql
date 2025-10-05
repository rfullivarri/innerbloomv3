INSERT INTO pillars (id, name, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Body', 'Care for your physical self'),
    ('22222222-2222-2222-2222-222222222222', 'Mind', 'Grow your brilliant brain'),
    ('33333333-3333-3333-3333-333333333333', 'Soul', 'Nurture your heart')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO traits (id, pillar_id, name, description)
VALUES
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Strength', 'Feel strong like a superhero'),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Focus', 'Give your mind a calm hug'),
    ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'Kindness', 'Spread sparkles to friends')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    pillar_id = EXCLUDED.pillar_id,
    updated_at = now();

INSERT INTO stats (id, trait_id, name, unit)
VALUES
    ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Push Ups', 'reps'),
    ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'Meditation Minutes', 'minutes'),
    ('99999999-9999-9999-9999-999999999999', '66666666-6666-6666-6666-666666666666', 'Gratitude Notes', 'notes')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    unit = EXCLUDED.unit,
    trait_id = EXCLUDED.trait_id,
    updated_at = now();

INSERT INTO users (id, email, display_name)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'demo@innerbloom.test', 'Demo Kid')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = now();

INSERT INTO tasks (id, user_id, pillar_id, trait_id, stat_id, title, description)
VALUES
    ('aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'Morning Stretch', 'Stretch tall like a tree for five minutes.'),
    ('aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'Quiet Breathing', 'Take three calm belly breaths.'),
    ('aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', '99999999-9999-9999-9999-999999999999', 'Share a Smile', 'Tell someone why they are awesome.')
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    pillar_id = EXCLUDED.pillar_id,
    trait_id = EXCLUDED.trait_id,
    stat_id = EXCLUDED.stat_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO user_rewards (id, user_id, reward_name, points)
VALUES
    ('bbbbbbb1-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '00000000-0000-0000-0000-000000000001', 'First Steps', 10)
ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    reward_name = EXCLUDED.reward_name,
    points = EXCLUDED.points,
    updated_at = now();
