import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { TaskInsightsResponse } from '../../../lib/api';
import { TaskInsightsModal, getHabitHealth } from '../StreakTaskInsightsModal';

const mockInsights = vi.hoisted<TaskInsightsResponse>(() => ({
  task: { id: 'task-123', name: 'Nueva tarea', stat: 'Metric', description: null },
  month: { totalCount: 0, days: [] },
  weeks: {
    weeklyGoal: 3,
    completionRate: 83,
    currentStreak: 5,
    bestStreak: 8,
    timeline: Array.from({ length: 12 }, (_, index) => ({
      weekStart: `2024-0${index + 1}-01`,
      weekEnd: `2024-0${index + 1}-07`,
      count: 3,
      hit: index < 10,
    })),
  },
}));

const mockUseRequest = vi.hoisted(() =>
  vi.fn(() => ({ data: mockInsights, error: null, status: 'success' as const, reload: vi.fn() })),
);

vi.mock('../../../hooks/useRequest', () => ({
  useRequest: mockUseRequest,
}));

vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return {
    ...actual,
    getTaskInsights: vi.fn(async () => mockInsights),
  };
});

describe('getHabitHealth', () => {
  test('calcula la salud de hábito aun con pocas semanas de muestra', () => {
    expect(getHabitHealth(100, 3)).toEqual({ level: 'strong', label: 'Hábito fuerte' });
  });

  test('clasifica correctamente hábitos débiles, en construcción y fuertes', () => {
    expect(getHabitHealth(40, 8)).toEqual({ level: 'weak', label: 'Hábito frágil' });
    expect(getHabitHealth(55, 6)).toEqual({ level: 'medium', label: 'Hábito en construcción' });
    expect(getHabitHealth(79, 5)).toEqual({ level: 'medium', label: 'Hábito en construcción' });
    expect(getHabitHealth(80, 12)).toEqual({ level: 'strong', label: 'Hábito fuerte' });
  });
});

describe('TaskInsightsModal', () => {
  test('muestra el chip de hábito fuerte cuando el endpoint reporta 83% en 12 semanas', async () => {
    render(
      <TaskInsightsModal
        taskId="task-123"
        weeklyGoal={3}
        mode="Flow"
        range="week"
        onClose={() => {}}
        fallbackTask={{ id: 'task-123', name: 'Nueva tarea', stat: 'Metric' }}
      />,
    );

    expect(await screen.findByText('Hábito fuerte')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
  });

  test('usa weeksSample del backend aunque la timeline esté truncada', async () => {
    const insightsWithSample: TaskInsightsResponse = {
      ...mockInsights,
      weeks: {
        ...mockInsights.weeks,
        weeksSample: 12,
        timeline: mockInsights.weeks.timeline.slice(0, 2),
      },
    };

    mockUseRequest.mockReturnValueOnce({
      data: insightsWithSample,
      error: null,
      status: 'success',
      reload: vi.fn(),
    });

    render(
      <TaskInsightsModal
        taskId="task-123"
        weeklyGoal={3}
        mode="Flow"
        range="week"
        onClose={() => {}}
        fallbackTask={{ id: 'task-123', name: 'Nueva tarea', stat: 'Metric' }}
      />,
    );

    expect(await screen.findByText('Hábito fuerte')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
  });
});
