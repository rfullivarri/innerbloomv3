BEGIN;
-- Manual helpers for rebuilding aggregates (run after bulk imports)
REFRESH MATERIALIZED VIEW mv_task_weeks;
REFRESH MATERIALIZED VIEW mv_user_progress;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_weeks;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_progress;
COMMIT;
