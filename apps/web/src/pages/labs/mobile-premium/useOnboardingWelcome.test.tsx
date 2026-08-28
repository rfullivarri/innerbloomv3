import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OnboardingProgress } from '../../../lib/api';
import { buildOnboardingWelcomeStorageKey, useOnboardingWelcome } from './useOnboardingWelcome';

function progress(overrides: Partial<OnboardingProgress> = {}): OnboardingProgress {
  return {
    user_id: 'user-1',
    onboarding_session_id: 'session-1',
    version: 1,
    state: 'in_progress',
    onboarding_started_at: '2026-08-28T10:00:00.000Z',
    game_mode_selected_at: null,
    avatar_selected_at: null,
    moderation_selected_at: null,
    tasks_generated_at: '2026-08-28T10:01:00.000Z',
    first_task_edited_at: null,
    returned_to_dashboard_after_first_edit_at: null,
    moderation_modal_shown_at: null,
    moderation_modal_resolved_at: null,
    first_daily_quest_prompted_at: null,
    first_daily_quest_completed_at: null,
    daily_quest_scheduled_at: null,
    onboarding_completed_at: null,
    source: {},
    created_at: '2026-08-28T10:00:00.000Z',
    updated_at: '2026-08-28T10:01:00.000Z',
    ...overrides,
  };
}

describe('useOnboardingWelcome', () => {
  it('uses the onboarding session as the stable persistence identity', () => {
    expect(buildOnboardingWelcomeStorageKey(progress(), 'fallback-user')).toBe(
      'innerbloom.innerbloom2.onboardingWelcomeSeen.v2:session-1',
    );
  });

  it('does not show the welcome banner retroactively for an already completed account', () => {
    const completed = progress({
      first_task_edited_at: '2026-01-10T10:03:00.000Z',
      first_daily_quest_completed_at: '2026-01-10T10:06:00.000Z',
      daily_quest_scheduled_at: '2026-01-10T10:08:00.000Z',
    });
    const { result } = renderHook(() => useOnboardingWelcome(completed));

    expect(result.current.shouldShowWelcome).toBe(false);
  });

  it('shows the welcome banner once when onboarding transitions to completed', () => {
    const initial = progress();
    const { result, rerender } = renderHook(
      ({ value }) => useOnboardingWelcome(value),
      { initialProps: { value: initial } },
    );

    expect(result.current.shouldShowWelcome).toBe(false);

    rerender({
      value: progress({
        first_task_edited_at: '2026-08-28T10:03:00.000Z',
        first_daily_quest_completed_at: '2026-08-28T10:06:00.000Z',
        daily_quest_scheduled_at: '2026-08-28T10:08:00.000Z',
      }),
    });

    expect(result.current.shouldShowWelcome).toBe(true);
  });
});
