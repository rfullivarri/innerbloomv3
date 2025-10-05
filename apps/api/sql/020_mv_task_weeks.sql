BEGIN;
-- Weekly aggregation of task completions

DROP MATERIALIZED VIEW IF EXISTS mv_task_weeks;

CREATE MATERIALIZED VIEW mv_task_weeks AS
SELECT
    tl.user_id,
    tl.task_id,
    date_trunc('week', tl.done_at)::date AS week_start,
    COUNT(*)::INT AS times_in_week
FROM task_logs tl
GROUP BY tl.user_id, tl.task_id, date_trunc('week', tl.done_at)::date
WITH NO DATA;

CREATE INDEX mv_task_weeks_user_task_week_idx
    ON mv_task_weeks (user_id, task_id, week_start);

COMMENT ON MATERIALIZED VIEW mv_task_weeks IS 'Refresh after task_logs inserts; use REFRESH CONCURRENTLY in production.';

COMMIT;
