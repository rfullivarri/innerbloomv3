import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDailyQuestReadiness } from '../useDailyQuestReadiness';
import { __resetUserTasksStore } from '../useUserTasks';
import { invalidateRequestCache } from '../useRequest';

const mockGetUserTasks = vi.fn();
const mockGetUserJourney = vi.fn();
const mockGetJourneyGenerationStatus = vi.fn();
const mockGetOnboardingProgress = vi.fn();

vi.mock('../../lib/api', () => ({
  getUserTasks: (...args: unknown[]) => mockGetUserTasks(...args),
  getUserJourney: (...args: unknown[]) => mockGetUserJourney(...args),
  getJourneyGenerationStatus: (...args: unknown[]) => mockGetJourneyGenerationStatus(...args),
  getOnboardingProgress: (...args: unknown[]) => mockGetOnboardingProgress(...args),
}));

vi.mock('../../lib/journeyGeneration', () => ({
  clearJourneyGenerationPending: vi.fn(),
  isJourneyGenerationPending: vi.fn(() => false),
}));

describe('useDailyQuestReadiness', () => {
  beforeEach(() => {
    invalidateRequestCache();
    __resetUserTasksStore();
    mockGetUserTasks.mockReset();
    mockGetUserJourney.mockReset();
    mockGetJourneyGenerationStatus.mockReset();
    mockGetOnboardingProgress.mockReset();
    mockGetJourneyGenerationStatus.mockResolvedValue({ ok: true, state: null });
    mockGetOnboardingProgress.mockResolvedValue({ progress: null });
  });

  it('shows onboarding guidance when user has no tasks', async () => {
    mockGetUserTasks.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useDailyQuestReadiness('user-1'));

    await waitFor(() => expect(result.current.tasksStatus).toBe('success'));

    expect(result.current.hasTasks).toBe(false);
    expect(result.current.firstTasksConfirmed).toBe(false);
    expect(result.current.completedFirstDailyQuest).toBe(false);
    expect(result.current.canOpenDailyQuest).toBe(false);
    expect(result.current.canShowDailyQuestPopup).toBe(false);
    expect(result.current.canAutoOpenDailyQuestPopup).toBe(false);
    expect(result.current.showOnboardingGuidance).toBe(true);
    expect(mockGetUserJourney).not.toHaveBeenCalled();
  });

  it('shows onboarding guidance when has tasks but base is not confirmed', async () => {
    mockGetUserTasks.mockResolvedValueOnce([
      { id: 'task-1', title: 'Tarea', isActive: true },
    ]);
    mockGetUserJourney.mockResolvedValueOnce({
      first_date_log: null,
      days_of_journey: 0,
      quantity_daily_logs: 0,
      first_programmed: false,
      first_tasks_confirmed: false,
      completed_first_daily_quest: false,
    });

    const { result } = renderHook(() => useDailyQuestReadiness('user-1'));

    await waitFor(() => expect(result.current.journeyStatus).toBe('success'));

    expect(result.current.hasTasks).toBe(true);
    expect(result.current.firstTasksConfirmed).toBe(false);
    expect(result.current.completedFirstDailyQuest).toBe(false);
    expect(result.current.canOpenDailyQuest).toBe(false);
    expect(result.current.canShowDailyQuestPopup).toBe(false);
    expect(result.current.canAutoOpenDailyQuestPopup).toBe(false);
    expect(result.current.showOnboardingGuidance).toBe(true);
  });


  it('allows manual Daily Quest but blocks auto-open until first completion', async () => {
    mockGetUserTasks.mockResolvedValueOnce([
      { id: 'task-1', title: 'Tarea', isActive: true },
    ]);
    mockGetUserJourney.mockResolvedValueOnce({
      first_date_log: null,
      days_of_journey: 0,
      quantity_daily_logs: 0,
      first_programmed: false,
      first_tasks_confirmed: true,
      completed_first_daily_quest: false,
    });

    const { result } = renderHook(() => useDailyQuestReadiness('user-1'));

    await waitFor(() => expect(result.current.journeyStatus).toBe('success'));

    expect(result.current.canOpenDailyQuest).toBe(true);
    expect(result.current.canShowDailyQuestPopup).toBe(true);
    expect(result.current.canAutoOpenDailyQuestPopup).toBe(false);
  });

  it('is ready when user has tasks and confirmed base', async () => {
    mockGetUserTasks.mockResolvedValueOnce([
      { id: 'task-1', title: 'Tarea', isActive: true },
    ]);
    mockGetUserJourney.mockResolvedValueOnce({
      first_date_log: '2024-01-01',
      days_of_journey: 12,
      quantity_daily_logs: 4,
      first_programmed: true,
      first_tasks_confirmed: true,
      completed_first_daily_quest: true,
    });

    const { result } = renderHook(() => useDailyQuestReadiness('user-1'));

    await waitFor(() => expect(result.current.journeyStatus).toBe('success'));

    expect(result.current.hasTasks).toBe(true);
    expect(result.current.firstTasksConfirmed).toBe(true);
    expect(result.current.completedFirstDailyQuest).toBe(true);
    expect(result.current.canOpenDailyQuest).toBe(true);
    expect(result.current.canShowDailyQuestPopup).toBe(true);
    expect(result.current.canAutoOpenDailyQuestPopup).toBe(true);
    expect(result.current.showOnboardingGuidance).toBe(false);
  });
});
