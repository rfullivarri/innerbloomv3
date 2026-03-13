CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  onboarding_session_id uuid NULL REFERENCES onboarding_session(onboarding_session_id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'completed')),
  onboarding_started_at timestamptz NULL,
  game_mode_selected_at timestamptz NULL,
  moderation_selected_at timestamptz NULL,
  tasks_generated_at timestamptz NULL,
  first_task_edited_at timestamptz NULL,
  returned_to_dashboard_after_first_edit_at timestamptz NULL,
  moderation_modal_shown_at timestamptz NULL,
  moderation_modal_resolved_at timestamptz NULL,
  first_daily_quest_prompted_at timestamptz NULL,
  first_daily_quest_completed_at timestamptz NULL,
  daily_quest_scheduled_at timestamptz NULL,
  onboarding_completed_at timestamptz NULL,
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_progress_state
  ON user_onboarding_progress (state);
