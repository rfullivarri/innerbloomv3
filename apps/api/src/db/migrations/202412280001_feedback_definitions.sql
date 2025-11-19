-- Feedback definitions metadata
CREATE TABLE IF NOT EXISTS feedback_definitions (
  feedback_definition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key text NOT NULL UNIQUE,
  label text NOT NULL,
  type text NOT NULL,
  scope text[] NOT NULL DEFAULT ARRAY[]::text[],
  trigger text NOT NULL,
  channel text NOT NULL,
  frequency text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  priority integer NOT NULL DEFAULT 0,
  copy text NOT NULL,
  cta_label text,
  cta_href text,
  preview_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_definitions_notification_key_idx
  ON feedback_definitions (notification_key);

INSERT INTO feedback_definitions (
  notification_key,
  label,
  type,
  scope,
  trigger,
  channel,
  frequency,
  status,
  priority,
  copy,
  cta_label,
  cta_href,
  preview_variables
)
VALUES (
  'scheduler_daily_reminder_email',
  'Email recordatorio diario',
  'daily_reminder',
  ARRAY['email', 'daily_quest', 'scheduler'],
  'Cron /internal/cron/daily-reminders con usuarios activos',
  'email',
  'daily',
  'active',
  50,
  'Hola {{user_name}}, tu Daily Quest de {{friendly_date}} ya está lista. Sumá XP registrando tu emoción del día y marcando tus hábitos completados.',
  'Abrir Daily Quest',
  'https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open',
  '{"user_name":"Majo","friendly_date":"lunes","cta_url":"https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open"}'
)
ON CONFLICT (notification_key) DO NOTHING;
