import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useOnboardingProgressMock = vi.fn();

vi.mock('../useOnboardingProgress', () => ({
  useOnboardingProgress: () => useOnboardingProgressMock(),
}));

import { useOnboardingEditorNudge } from '../useOnboardingEditorNudge';
import { buildOnboardingOverlayStorageKey } from '../../lib/onboardingOverlayStorage';

const baseProgress = {
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

describe('useOnboardingEditorNudge', () => {
  const markStepMock = vi.fn();

  beforeEach(() => {
    window.localStorage.clear();
    markStepMock.mockReset();
    markStepMock.mockResolvedValue(baseProgress);
    useOnboardingProgressMock.mockReset();
    useOnboardingProgressMock.mockReturnValue({
      progress: baseProgress,
      markStep: markStepMock,
    });
  });

  it('uses the current journey scoped overlay instead of legacy global flags', async () => {
    window.localStorage.setItem('ib.onboarding.taskEditorFirstEditDone', '1');
    window.localStorage.setItem(
      buildOnboardingOverlayStorageKey(
        { userId: 'user-1', onboardingSessionId: 'session-1' },
        'taskEditorFirstEditDone',
      ),
      '1',
    );

    const { result } = renderHook(() => useOnboardingEditorNudge());

    await waitFor(() => {
      expect(result.current.firstEditDone).toBe(true);
    });

    expect(result.current.shouldShowInlineNotice).toBe(true);
  });

  it('does not let scoped overlay from another journey leak into the current one', async () => {
    window.localStorage.setItem(
      buildOnboardingOverlayStorageKey(
        { userId: 'user-1', onboardingSessionId: 'session-999' },
        'taskEditorFirstEditDone',
      ),
      '1',
    );

    const { result } = renderHook(() => useOnboardingEditorNudge());

    await waitFor(() => {
      expect(result.current.firstEditDone).toBe(false);
    });

    expect(result.current.shouldShowInlineNotice).toBe(false);
  });

  it('writes scoped overlay flags immediately when editing and returning to dashboard', async () => {
    const { result } = renderHook(() => useOnboardingEditorNudge());

    await act(async () => {
      await result.current.markFirstEditDone();
    });

    expect(
      window.localStorage.getItem(
        buildOnboardingOverlayStorageKey(
          { userId: 'user-1', onboardingSessionId: 'session-1' },
          'taskEditorFirstEditDone',
        ),
      ),
    ).toBe('1');
    expect(markStepMock).toHaveBeenCalledWith('first_task_edited', {
      trigger: 'editor_first_edit_ui',
    });

    await act(async () => {
      await result.current.markReturnedToDashboard();
    });

    expect(
      window.localStorage.getItem(
        buildOnboardingOverlayStorageKey(
          { userId: 'user-1', onboardingSessionId: 'session-1' },
          'hasReturnedToDashboardAfterEdit',
        ),
      ),
    ).toBe('1');
    expect(markStepMock).toHaveBeenCalledWith(
      'returned_to_dashboard_after_first_edit',
      { trigger: 'editor_return_dashboard' },
    );
  });
});
