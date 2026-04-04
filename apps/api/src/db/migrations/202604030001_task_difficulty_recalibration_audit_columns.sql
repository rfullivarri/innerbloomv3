ALTER TABLE task_difficulty_recalibrations
ADD COLUMN IF NOT EXISTS rule_matched text,
ADD COLUMN IF NOT EXISTS reason text,
ADD COLUMN IF NOT EXISTS clamp_applied boolean NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clamp_reason text;

UPDATE task_difficulty_recalibrations
   SET rule_matched = CASE
     WHEN completion_rate >= 0.8 THEN 'rate_gt_80'
     WHEN completion_rate < 0.5 THEN 'rate_lt_50'
     ELSE 'rate_50_79'
   END
 WHERE rule_matched IS NULL;

UPDATE task_difficulty_recalibrations
   SET reason = CASE
     WHEN completion_rate >= 0.8 THEN 'Historical row migrated: completion rate at or above 80%, system suggested decreasing difficulty by one level.'
     WHEN completion_rate < 0.5 THEN 'Historical row migrated: completion rate below 50%, system suggested increasing difficulty by one level.'
     ELSE 'Historical row migrated: completion rate between 50% and 79%, difficulty kept.'
   END
 WHERE reason IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_difficulty_recalibrations_rule_matched_chk'
  ) THEN
    ALTER TABLE task_difficulty_recalibrations
      ADD CONSTRAINT task_difficulty_recalibrations_rule_matched_chk
      CHECK (rule_matched IN ('rate_gt_80', 'rate_50_79', 'rate_lt_50'));
  END IF;
END;
$$;

ALTER TABLE task_difficulty_recalibrations
ALTER COLUMN rule_matched SET NOT NULL,
ALTER COLUMN reason SET NOT NULL;
