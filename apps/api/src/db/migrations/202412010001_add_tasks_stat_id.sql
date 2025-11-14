-- Add stat_id column to tasks so we can persist stat assignments from the editor
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS stat_id smallint;

-- Backfill existing rows using trait_id as a fallback when the new column is empty
UPDATE tasks
   SET stat_id = trait_id
 WHERE stat_id IS NULL;
