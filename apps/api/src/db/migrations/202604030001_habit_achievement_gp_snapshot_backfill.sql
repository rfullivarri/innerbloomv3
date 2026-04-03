-- Backfill frozen GP snapshot for achievements created before server-side snapshotting.
WITH achievement_gp AS (
  SELECT ha.task_habit_achievement_id,
         COALESCE(SUM(COALESCE(t.xp_base, cd.xp_base, 0) * GREATEST(dl.quantity, 1)), 0)::int AS gp_total
    FROM task_habit_achievements ha
    JOIN tasks t ON t.task_id = ha.task_id
LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
LEFT JOIN daily_log dl
       ON dl.task_id = ha.task_id
      AND dl.user_id = ha.user_id
      AND dl.date <= ha.detected_at::date
GROUP BY ha.task_habit_achievement_id
)
UPDATE task_habit_achievements ha
   SET gp_generated_until_achievement = achievement_gp.gp_total,
       updated_at = NOW()
  FROM achievement_gp
 WHERE ha.task_habit_achievement_id = achievement_gp.task_habit_achievement_id
   AND COALESCE(ha.gp_generated_until_achievement, 0) = 0;
