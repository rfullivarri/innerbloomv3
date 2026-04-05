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

vi.mock('../../../i18n/postLoginLanguage', () => ({
  usePostLoginLanguage: () => ({ language: 'es' as const, t: (key: string) => key }),
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
  test('renderiza el chip de dificultad sin prefijo y localizado', async () => {
    const insightsWithDifficulty: TaskInsightsResponse = {
      ...mockInsights,
      task: {
        ...mockInsights.task,
        difficultyLabel: 'medium',
      },
    };

    mockUseRequest.mockReturnValueOnce({
      data: insightsWithDifficulty,
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

    expect(await screen.findByText('Media')).toBeInTheDocument();
    expect(screen.queryByText(/Dificultad:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Difficulty:/i)).not.toBeInTheDocument();
  });

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

  test('excluye la semana en curso del rango de semanas usado para el chip', async () => {
    const referenceDate = new Date('2024-02-06T12:00:00Z');

    const insightsWithCurrentWeek: TaskInsightsResponse = {
      ...mockInsights,
      weeks: {
        ...mockInsights.weeks,
        completionRate: 60,
        weeksSample: 6,
        timeline: [
          { weekStart: '2024-01-15', weekEnd: '2024-01-21', count: 3, hit: true },
          { weekStart: '2024-01-22', weekEnd: '2024-01-28', count: 1, hit: false },
          { weekStart: '2024-02-05', weekEnd: '2024-02-11', count: 2, hit: false },
        ],
      },
    };

    mockUseRequest.mockReturnValueOnce({
      data: insightsWithCurrentWeek,
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
        referenceDate={referenceDate}
      />,
    );

    expect(await screen.findByText('Hábito en construcción')).toBeInTheDocument();
    expect(screen.getByText('Meta cumplida 1 de 5 semanas.')).toBeInTheDocument();
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

  test('muestra chips compactos y limpia el prefijo migrado en razones históricas', async () => {
    const insightsWithRecalibration: TaskInsightsResponse = {
      ...mockInsights,
      recalibration: {
        eligible: true,
        latest: {
          action: 'down',
          periodStart: '2026-02-01',
          expectedTarget: 10,
          completions: 9,
          completionRate: 0.9,
          reason: 'Historical row migrated: completion rate above 80%, system suggested decreasing difficulty by one level.',
          recalibratedAt: '2026-03-01T00:00:00.000Z',
        },
        history: [
          {
            action: 'down',
            periodStart: '2026-02-01',
            expectedTarget: 10,
            completions: 9,
            completionRate: 0.9,
            reason: 'Historical row migrated: completion rate above 80%, system suggested decreasing difficulty by one level.',
          },
          {
            action: 'keep',
            periodStart: '2026-01-01',
            expectedTarget: 8,
            completions: 5,
            completionRate: 0.62,
            reason: 'Historical row migrated: completion rate between 50% and 79%, difficulty kept.',
          },
          {
            action: 'up',
            periodStart: '2025-12-01',
            expectedTarget: 8,
            completions: 3,
            completionRate: 0.37,
            reason: 'Historical row migrated: completion rate below 50%, system suggested increasing difficulty by one level.',
          },
        ],
      },
    };

    mockUseRequest.mockReturnValueOnce({
      data: insightsWithRecalibration,
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

    expect(await screen.findByText('↓ Decreased')).toBeInTheDocument();
    expect(screen.getByText('• Kept')).toBeInTheDocument();
    expect(screen.getByText('↑ Increased')).toBeInTheDocument();
    expect(screen.queryByText(/Historical row migrated:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/completion rate above 80%/i)).toBeInTheDocument();
  });
});
