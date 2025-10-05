BEGIN;
-- Daily streak tracker + trigger hook on task_logs
CREATE TABLE IF NOT EXISTS daily_streaks (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_check_date DATE
);

CREATE OR REPLACE FUNCTION fn_award_on_task_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_date DATE := NEW.done_at::date;
    existing_record daily_streaks%ROWTYPE;
    next_current INTEGER;
    next_longest INTEGER;
BEGIN
    SELECT * INTO existing_record
    FROM daily_streaks
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO daily_streaks (user_id, current_streak, longest_streak, last_check_date)
        VALUES (NEW.user_id, 1, 1, target_date)
        ON CONFLICT (user_id) DO UPDATE
            SET current_streak = EXCLUDED.current_streak,
                longest_streak = GREATEST(daily_streaks.longest_streak, EXCLUDED.longest_streak),
                last_check_date = EXCLUDED.last_check_date;
    ELSE
        IF existing_record.last_check_date = target_date THEN
            next_current := existing_record.current_streak;
        ELSIF existing_record.last_check_date = target_date - 1 THEN
            next_current := existing_record.current_streak + 1;
        ELSE
            next_current := 1;
        END IF;

        next_longest := GREATEST(existing_record.longest_streak, next_current);

        UPDATE daily_streaks
        SET current_streak = next_current,
            longest_streak = next_longest,
            last_check_date = target_date
        WHERE user_id = NEW.user_id;
    END IF;

    BEGIN
        REFRESH MATERIALIZED VIEW mv_task_weeks;
        REFRESH MATERIALIZED VIEW mv_user_progress;
        -- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_task_weeks;
        -- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_progress;
    EXCEPTION
        WHEN undefined_table OR invalid_schema_name THEN
            NULL;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_logs_daily_streak ON task_logs;
CREATE TRIGGER trg_task_logs_daily_streak
AFTER INSERT ON task_logs
FOR EACH ROW
EXECUTE FUNCTION fn_award_on_task_log();

COMMIT;
