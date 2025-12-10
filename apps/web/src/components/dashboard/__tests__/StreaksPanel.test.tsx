import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { StreakPanelResponse, TaskInsightsResponse } from '../../../lib/api';

const mockPanelData = vi.hoisted<StreakPanelResponse>(() => ({
  topStreaks: [
    {
      id: 'task-1',
      name: 'Primera tarea',
      stat: 'Metric A',
      weekDone: 2,
      streakDays: 4,
    },
  ],
  tasks: [
    {
      id: 'task-1',
      name: 'Primera tarea',
      stat: 'Metric A',
      weekDone: 2,
      streakDays: 4,
      metrics: {
        week: { count: 2, xp: 10 },
        month: { count: 8, xp: 40, weeks: [2, 2, 2, 2] },
        qtr: { count: 16, xp: 80, weeks: [4, 4, 4, 4] },
      },
    },
    {
      id: 'task-2',
      name: 'Segunda tarea',
      stat: 'Metric B',
      weekDone: 1,
      streakDays: 1,
      metrics: {
        week: { count: 1, xp: 5 },
        month: { count: 4, xp: 20, weeks: [1, 1, 1, 1] },
        qtr: { count: 8, xp: 40, weeks: [2, 2, 2, 2] },
      },
    },
  ],
}));

const mockInsights = vi.hoisted<TaskInsightsResponse>(() => ({
  task: { id: 'task-1', name: 'Primera tarea', stat: 'Metric A', description: 'Detalle' },
  month: {
    totalCount: 5,
    days: [
      { date: '2024-08-01', count: 1 },
      { date: '2024-08-02', count: 2 },
      { date: '2024-08-03', count: 2 },
    ],
  },
  weeks: {
    weeklyGoal: 3,
    completionRate: 80,
    currentStreak: 2,
    bestStreak: 4,
    timeline: [
      { weekStart: '2024-08-01', weekEnd: '2024-08-07', count: 3, hit: true },
      { weekStart: '2024-08-08', weekEnd: '2024-08-14', count: 2, hit: false },
    ],
  },
}));

const mockUseRequest = vi.hoisted(() =>
  vi.fn((factory: () => Promise<unknown>, deps: unknown[] = [], options: { enabled?: boolean } = {}) => {
    const enabled = options.enabled ?? true;
    if (!enabled) {
      return { data: null, error: null, status: 'idle' as const, reload: vi.fn() };
    }

    void factory();

    const isTaskInsights = Array.isArray(deps) && typeof deps[0] === 'string' && deps[0].startsWith('task-');
    const response = isTaskInsights
      ? { data: mockInsights, error: null, status: 'success' as const }
      : { data: mockPanelData, error: null, status: 'success' as const };

    return { ...response, reload: vi.fn() };
  }),
);

const getTaskInsightsMock = vi.hoisted(() => vi.fn(async () => mockInsights));

vi.mock('../../../hooks/useRequest', () => ({
  useRequest: mockUseRequest,
}));

vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return {
    ...actual,
    getTaskInsights: getTaskInsightsMock,
    getUserStreakPanel: vi.fn(async () => mockPanelData),
  };
});

// Import after mocks
import { StreaksPanel } from '../StreaksPanel';

describe('StreaksPanel', () => {
  beforeEach(() => {
    getTaskInsightsMock.mockClear();
  });

  test('muestra modal de insights al seleccionar una tarea y bloquea el scroll', async () => {
    const user = userEvent.setup();

    render(<StreaksPanel userId="user-1" gameMode="Flow" weeklyTarget={3} />);

    expect(screen.queryByText(/Detalle de tarea/i)).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(getTaskInsightsMock).not.toHaveBeenCalled();
    expect(mockUseRequest).toHaveBeenCalled();

    const taskCard = (await screen.findByText('Primera tarea')).closest('article');
    expect(taskCard).toBeTruthy();

    await user.click(taskCard!);

    expect(await screen.findByText('Detalle de tarea')).toBeInTheDocument();
    expect(getTaskInsightsMock).toHaveBeenCalledTimes(1);

    const overlay = document.body.querySelector('[role="presentation"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay?.className).toContain('fixed');
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('abre el modal de insights al seleccionar una tarea en otro scope', async () => {
    const user = userEvent.setup();

    render(<StreaksPanel userId="user-1" gameMode="Flow" weeklyTarget={3} />);

    const quarterlyScope = await screen.findByRole('button', { name: /3m/i });
    await user.click(quarterlyScope);

    const taskCard = (await screen.findByText('Primera tarea')).closest('article');
    expect(taskCard).toBeTruthy();

    await user.click(taskCard!);

    expect(getTaskInsightsMock).toHaveBeenCalled();
    expect(getTaskInsightsMock.mock.calls.at(-1)?.[1]?.range).toBe('qtr');
  });
});
