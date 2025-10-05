BEGIN;
-- User XP totals + level progress

DROP MATERIALIZED VIEW IF EXISTS public.mv_user_progress;

CREATE MATERIALIZED VIEW public.mv_user_progress AS
WITH xp_base AS (
    SELECT
        u.id AS user_id,
        COALESCE(SUM(t.xp), 0)::BIGINT AS total_xp
    FROM users u
    LEFT JOIN task_logs tl ON tl.user_id = u.id
    LEFT JOIN tasks t ON t.id = tl.task_id
    GROUP BY u.id
),
lvl AS (
    SELECT
        xb.user_id,
        xb.total_xp,
        COALESCE((
            SELECT MAX(lr.level)
            FROM level_rules lr
            WHERE lr.xp_required <= xb.total_xp
        ), 1) AS level,
        COALESCE((
            SELECT MIN(lr.xp_required)
            FROM level_rules lr
            WHERE lr.xp_required > xb.total_xp
        ), xb.total_xp) AS next_level_xp
    FROM xp_base xb
)
SELECT
    lvl.user_id,
    lvl.total_xp,
    lvl.level,
    lvl.next_level_xp,
    GREATEST(lvl.next_level_xp - lvl.total_xp, 0) AS progress_to_next
FROM lvl
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_user_progress_user_id_idx ON public.mv_user_progress (user_id);

COMMENT ON MATERIALIZED VIEW public.mv_user_progress IS 'Refresh to sync XP/levels after task logs; consider REFRESH CONCURRENTLY in prod.';

COMMIT;
