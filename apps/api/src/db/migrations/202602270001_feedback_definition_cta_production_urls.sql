-- Align default feedback definition CTAs to production web URLs
UPDATE feedback_definitions
SET
  cta_href = 'https://innerbloomjourney.org/dashboard-v3?daily-quest=open',
  preview_variables = jsonb_set(
    COALESCE(preview_variables, '{}'::jsonb),
    '{cta_url}',
    '"https://innerbloomjourney.org/dashboard-v3?daily-quest=open"'::jsonb,
    true
  ),
  updated_at = now()
WHERE notification_key = 'scheduler_daily_reminder_email';

UPDATE feedback_definitions
SET
  cta_href = 'https://innerbloomjourney.org/dashboard-v3?ai-tasks=open',
  preview_variables = jsonb_set(
    COALESCE(preview_variables, '{}'::jsonb),
    '{cta_url}',
    '"https://innerbloomjourney.org/dashboard-v3?ai-tasks=open"'::jsonb,
    true
  ),
  updated_at = now()
WHERE notification_key = 'taskgen_ai_tasks_confirmation_email';
