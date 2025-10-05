INSERT INTO players (nickname, total_xp)
VALUES ('Chill Player', 0)
ON CONFLICT (nickname) DO NOTHING;
