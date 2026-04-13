ALTER TABLE user_onboarding_progress
  ADD COLUMN IF NOT EXISTS avatar_selected_at timestamptz NULL;
