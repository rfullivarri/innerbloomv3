import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RewardsHistorySummary, TaskInsightsResponse } from '../../../lib/api';
import { RewardsSection } from '../RewardsSection';

const getRewardsHistoryMock = vi.fn();
const getTaskInsightsMock = vi.fn();
const toggleTaskHabitAchievementMaintainedMock = vi.fn();
const decideTaskHabitAchievementMock = vi.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({ language: 'en' as const }),
}));

vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return {
    ...actual,
    getRewardsHistory: (...args: unknown[]) => getRewardsHistoryMock(...args),
    getTaskInsights: (...args: unknown[]) => getTaskInsightsMock(...args),
    toggleTaskHabitAchievementMaintained: (...args: unknown[]) => toggleTaskHabitAchievementMaintainedMock(...args),
    decideTaskHabitAchievement: (...args: unknown[]) => decideTaskHabitAchievementMock(...args),
  };
});

const initialData: RewardsHistorySummary = {
  weeklyWrapups: [],
  weeklyUnseenCount: 0,
  monthlyWrapups: [],
  growthCalibration: {
    countdownDays: 15,
    latestPeriodLabel: '2026-03',
    summary: { up: 1, keep: 1, down: 1, total: 3 },
    latestResults: [
      {
        taskId: 'task-up',
        taskTitle: 'Hydrate',
        pillar: 'Body',
        difficultyBefore: 'easy',
        difficultyAfter: 'normal',
        expectedTarget: 5,
        actualCompletions: 6,
        completionRatePct: 120,
        finalAction: 'up',
        result: 'increased',
        reason: 'High completion consistency',
        clampApplied: false,
        clampReason: null,
        evaluatedAt: '2026-04-01T00:00:00.000Z',
        evaluationMonthLabel: '2026-03',
      },
      {
        taskId: 'task-keep',
        taskTitle: 'Read 10 pages',
        pillar: 'Mind',
        difficultyBefore: 'normal',
        difficultyAfter: 'normal',
        expectedTarget: 4,
        actualCompletions: 4,
        completionRatePct: 100,
        finalAction: 'keep',
        result: 'kept',
        reason: 'Target met',
        clampApplied: false,
        clampReason: null,
        evaluatedAt: '2026-04-01T00:00:00.000Z',
        evaluationMonthLabel: '2026-03',
      },
      {
        taskId: 'task-down',
        taskTitle: 'Meditate',
        pillar: 'Soul',
        difficultyBefore: 'hard',
        difficultyAfter: 'normal',
        expectedTarget: 5,
        actualCompletions: 2,
        completionRatePct: 40,
        finalAction: 'down',
        result: 'decreased',
        reason: 'Low completion rate',
        clampApplied: true,
        clampReason: 'Guardrail: floor reached',
        evaluatedAt: '2026-04-01T00:00:00.000Z',
        evaluationMonthLabel: '2026-03',
      },
    ],
  },
  habitAchievements: {
    pendingCount: 0,
    achievedByPillar: [
      {
        pillar: { id: 'pillar-body', code: 'BODY', name: 'Body' },
        habits: [
          {
            id: 'habit-achieved',
            taskId: 'task-achieved',
            taskName: 'Hydrate',
            pillar: 'BODY',
            trait: { id: 'trait-res', code: 'RES', name: 'Resilience' },
            seal: { visible: true },
            status: 'maintained',
            achievedAt: '2026-03-30T00:00:00.000Z',
            decisionMadeAt: '2026-03-31T00:00:00.000Z',
            gpBeforeAchievement: 1220,
            gpSinceMaintain: 35,
            maintainEnabled: true,
          },
          {
            id: 'habit-preview',
            taskId: 'task-preview',
            taskName: 'Read 10 pages',
            pillar: 'BODY',
            trait: { id: 'trait-foc', code: 'FOC', name: 'Focus' },
            seal: { visible: false },
            status: 'not_achieved',
            achievedAt: null,
            decisionMadeAt: null,
            gpBeforeAchievement: 0,
            gpSinceMaintain: 0,
            maintainEnabled: false,
          },
        ],
      },
    ],
  },
};

const insightsResponse: TaskInsightsResponse = {
  task: { id: 'task-preview', name: 'Read 10 pages', stat: 'Focus', description: null },
  month: { totalCount: 4, totalXp: 120, days: [] },
  weeks: {
    weeklyGoal: 4,
    completionRate: 0.5,
    weeksSample: 8,
    currentStreak: 1,
    bestStreak: 2,
    timeline: [],
  },
  previewAchievement: {
    score: 74,
    status: 'building',
    consolidationStrength: 66,
    windowProximity: {
      slots: [
        { id: 'm1', label: 'M1', state: 'valid' },
        { id: 'm2', label: 'M2', state: 'pending' },
        { id: 'm3', label: 'M3', state: 'locked' },
      ],
    },
    recentMonths: [
      { month: '2026-01', value: 52, state: 'building' },
      { month: '2026-02', value: 63, state: 'building' },
      { month: '2026-03', value: 74, state: 'building' },
    ],
  },
  recalibration: { history: [], eligible: false },
};

describe('RewardsSection achieved shelf overlays', () => {
  it('renders growth calibration block with summary when data exists', async () => {
    getRewardsHistoryMock.mockResolvedValue(initialData);
    getTaskInsightsMock.mockResolvedValue(insightsResponse);

    render(<RewardsSection userId="user-123" initialData={initialData} />);

    expect(screen.getByText('Growth Calibration Results')).toBeInTheDocument();
    expect(screen.getByText('↑ 1')).toBeInTheDocument();
    expect(screen.getByText('• 1')).toBeInTheDocument();
    expect(screen.getByText('↓ 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View results' })).toBeInTheDocument();
  });

  it('renders growth calibration empty state when there are no results', async () => {
    const emptyGrowthData: RewardsHistorySummary = {
      ...initialData,
      growthCalibration: {
        countdownDays: 12,
        latestPeriodLabel: null,
        summary: { up: 0, keep: 0, down: 0, total: 0 },
        latestResults: [],
      },
    };
    getRewardsHistoryMock.mockResolvedValue(emptyGrowthData);

    render(<RewardsSection userId="user-123" initialData={emptyGrowthData} />);

    expect(screen.getByText('There are no Growth Calibration results yet. Your next adjustments will appear here.')).toBeInTheDocument();
  });

  it('opens growth calibration modal and renders up/keep/down rows', async () => {
    getRewardsHistoryMock.mockResolvedValue(initialData);
    getTaskInsightsMock.mockResolvedValue(insightsResponse);

    render(<RewardsSection userId="user-123" initialData={initialData} />);
    fireEvent.click(screen.getByRole('button', { name: 'View results' }));

    expect(await screen.findByText('Task')).toBeInTheDocument();
    expect(screen.getAllByText('Hydrate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Read 10 pages').length).toBeGreaterThan(0);
    expect(screen.getByText('Meditate')).toBeInTheDocument();
    expect(screen.getAllByText('↑').length).toBeGreaterThan(0);
    expect(screen.getAllByText('•').length).toBeGreaterThan(0);
    expect(screen.getAllByText('↓').length).toBeGreaterThan(0);
  });

  it('makes non-achieved tasks clickable and opens preview overlay with preview achievement card', async () => {
    getRewardsHistoryMock.mockResolvedValue(initialData);
    getTaskInsightsMock.mockResolvedValue(insightsResponse);

    render(<RewardsSection userId="user-123" initialData={initialData} />);

    expect(getTaskInsightsMock).not.toHaveBeenCalled();

    const previewButton = screen.getByRole('button', { name: /Read 10 pages/i });
    fireEvent.click(previewButton);

    expect(await screen.findByText('Seal path')).toBeInTheDocument();
    expect(await screen.findByLabelText('preview achievement score 74')).toBeInTheDocument();
    await waitFor(() => expect(getTaskInsightsMock).toHaveBeenCalledWith('task-preview'));
  });

  it('keeps achieved-task focus overlay behavior', async () => {
    getRewardsHistoryMock.mockResolvedValue(initialData);
    getTaskInsightsMock.mockResolvedValue(insightsResponse);

    render(<RewardsSection userId="user-123" initialData={initialData} />);

    fireEvent.click(screen.getByRole('button', { name: /Hydrate/i }));

    expect(await screen.findByText('Tap again to view the back side')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Tap again to view the back side/i }));

    expect(await screen.findByText('Keep maintained')).toBeInTheDocument();
    expect(toggleTaskHabitAchievementMaintainedMock).not.toHaveBeenCalled();
  });

  it('shows habit development on the back of locked carousel cards', async () => {
    getRewardsHistoryMock.mockResolvedValue(initialData);
    getTaskInsightsMock.mockResolvedValue(insightsResponse);

    render(<RewardsSection userId="user-123" initialData={initialData} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Carousel' }));
    fireEvent.click(screen.getByRole('button', { name: /Read 10 pages/i }));

    expect(await screen.findByText('Habit development')).toBeInTheDocument();
    expect(await screen.findByLabelText('preview achievement score 74')).toBeInTheDocument();
    await waitFor(() => expect(getTaskInsightsMock).toHaveBeenCalledWith('task-preview'));
  });
});
