import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOnboardingProgressMock = vi.fn();
const markOnboardingProgressMock = vi.fn();
const reconcileOnboardingProgressClientMock = vi.fn();

vi.mock('../../lib/api', () => ({
  getOnboardingProgress: (...args: unknown[]) => getOnboardingProgressMock(...args),
  markOnboardingProgress: (...args: unknown[]) => markOnboardingProgressMock(...args),
  reconcileOnboardingProgressClient: (...args: unknown[]) => reconcileOnboardingProgressClientMock(...args),
}));

import { useOnboardingProgress } from '../useOnboardingProgress';

const progressPayload = {
  user_id: 'user-1',
  onboarding_session_id: 'session-1',
  version: 1,
  state: 'in_progress' as const,
  onboarding_started_at: null,
  game_mode_selected_at: null,
  moderation_selected_at: null,
  tasks_generated_at: null,
  first_task_edited_at: null,
  returned_to_dashboard_after_first_edit_at: null,
  moderation_modal_shown_at: null,
  moderation_modal_resolved_at: null,
  first_daily_quest_prompted_at: null,
  first_daily_quest_completed_at: null,
  daily_quest_scheduled_at: null,
  onboarding_completed_at: null,
  source: {},
  created_at: '2026-03-19T00:00:00.000Z',
  updated_at: '2026-03-19T00:00:00.000Z',
};

describe('useOnboardingProgress', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getOnboardingProgressMock.mockReset();
    markOnboardingProgressMock.mockReset();
    reconcileOnboardingProgressClientMock.mockReset();
    getOnboardingProgressMock.mockResolvedValue({ ok: true, progress: progressPayload });
    markOnboardingProgressMock.mockResolvedValue({ ok: true, progress: progressPayload });
  });

  it('loads backend progress without reconciling legacy onboarding overlay flags', async () => {
    window.localStorage.setItem('ib.onboarding.moderationSelected', '1');
    window.localStorage.setItem('ib.onboarding.taskEditorFirstEditDone', '1');
    window.localStorage.setItem('ib.onboarding.hasReturnedToDashboardAfterEdit', '1');
    window.localStorage.setItem('ib.onboarding.moderationSuggestionResolved', '1');

    const { result } = renderHook(() => useOnboardingProgress());

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(getOnboardingProgressMock).toHaveBeenCalledTimes(1);
    expect(reconcileOnboardingProgressClientMock).not.toHaveBeenCalled();
  });
});
