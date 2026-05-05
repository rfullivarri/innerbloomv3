-- Diagnostic scaffold for habit achievement recovery validation.
-- 1) Seed a task with Feb/Mar/Apr cron recalibrations with completion_rate >= 0.8.
-- 2) Run monthly pipeline for periodKey = 'YYYY-04'.
-- 3) Validate pending achievement + task lifecycle.
SELECT 'Use admin POST /api/admin/monthly-pipeline/run with periodKey and then inspect task_habit_achievements/tasks.' AS instructions;
