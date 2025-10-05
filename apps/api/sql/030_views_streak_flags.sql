BEGIN;
-- Flags for consistency tiers (1-4 completions per week)
CREATE OR REPLACE VIEW v_task_weeks_flags AS
SELECT
    user_id,
    task_id,
    week_start,
    (times_in_week >= 1) AS c1s_ok,
    (times_in_week >= 2) AS c2s_ok,
    (times_in_week >= 3) AS c3s_ok,
    (times_in_week >= 4) AS c4s_ok
FROM mv_task_weeks;

COMMENT ON VIEW v_task_weeks_flags IS 'Boolean thresholds derived from mv_task_weeks (true when weekly count ≥ tier).';

COMMIT;
