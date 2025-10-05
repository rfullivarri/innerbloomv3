BEGIN;
-- Consecutive-week streak calculations (current + max)

DROP VIEW IF EXISTS public.v_task_streaks_actual CASCADE;

CREATE VIEW public.v_task_streaks_actual AS
WITH task_base AS (
    SELECT id AS task_id, user_id FROM tasks
),
flags AS (
    SELECT * FROM public.v_task_weeks_flags
),
latest AS (
    SELECT user_id, task_id, MAX(week_start) AS last_week
    FROM flags
    GROUP BY user_id, task_id
),
tier_weeks AS (
    SELECT 'c1s'::TEXT AS tier, user_id, task_id, week_start FROM flags WHERE c1s_ok
    UNION ALL
    SELECT 'c2s', user_id, task_id, week_start FROM flags WHERE c2s_ok
    UNION ALL
    SELECT 'c3s', user_id, task_id, week_start FROM flags WHERE c3s_ok
    UNION ALL
    SELECT 'c4s', user_id, task_id, week_start FROM flags WHERE c4s_ok
),
islands AS (
    SELECT tier, user_id, task_id, MIN(week_start) AS start_week, MAX(week_start) AS end_week, COUNT(*) AS streak_length
    FROM (
        SELECT tier,
               user_id,
               task_id,
               week_start,
               week_start - (ROW_NUMBER() OVER (PARTITION BY tier, user_id, task_id ORDER BY week_start)) * INTERVAL '1 week' AS grp
        FROM tier_weeks
    ) sub
    GROUP BY tier, user_id, task_id, grp
)
SELECT
    tb.user_id,
    tb.task_id,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c1s' AND i.end_week = latest.last_week), 0) AS c1s_actual,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c2s' AND i.end_week = latest.last_week), 0) AS c2s_actual,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c3s' AND i.end_week = latest.last_week), 0) AS c3s_actual,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c4s' AND i.end_week = latest.last_week), 0) AS c4s_actual
FROM task_base tb
LEFT JOIN latest ON latest.user_id = tb.user_id AND latest.task_id = tb.task_id
LEFT JOIN islands i ON i.user_id = tb.user_id AND i.task_id = tb.task_id
GROUP BY tb.user_id, tb.task_id;

DROP VIEW IF EXISTS public.v_task_streaks_max CASCADE;

CREATE VIEW public.v_task_streaks_max AS
WITH task_base AS (
    SELECT id AS task_id, user_id FROM tasks
),
flags AS (
    SELECT * FROM public.v_task_weeks_flags
),
tier_weeks AS (
    SELECT 'c1s'::TEXT AS tier, user_id, task_id, week_start FROM flags WHERE c1s_ok
    UNION ALL
    SELECT 'c2s', user_id, task_id, week_start FROM flags WHERE c2s_ok
    UNION ALL
    SELECT 'c3s', user_id, task_id, week_start FROM flags WHERE c3s_ok
    UNION ALL
    SELECT 'c4s', user_id, task_id, week_start FROM flags WHERE c4s_ok
),
islands AS (
    SELECT tier, user_id, task_id, MIN(week_start) AS start_week, MAX(week_start) AS end_week, COUNT(*) AS streak_length
    FROM (
        SELECT tier,
               user_id,
               task_id,
               week_start,
               week_start - (ROW_NUMBER() OVER (PARTITION BY tier, user_id, task_id ORDER BY week_start)) * INTERVAL '1 week' AS grp
        FROM tier_weeks
    ) sub
    GROUP BY tier, user_id, task_id, grp
)
SELECT
    tb.user_id,
    tb.task_id,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c1s'), 0) AS c1s_max,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c2s'), 0) AS c2s_max,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c3s'), 0) AS c3s_max,
    COALESCE(MAX(i.streak_length) FILTER (WHERE i.tier = 'c4s'), 0) AS c4s_max
FROM task_base tb
LEFT JOIN islands i ON i.user_id = tb.user_id AND i.task_id = tb.task_id
GROUP BY tb.user_id, tb.task_id;

COMMIT;
