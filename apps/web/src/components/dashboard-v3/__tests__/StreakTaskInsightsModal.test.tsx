import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import type { TaskInsightsResponse } from '../../../lib/api';
import { TaskInsightsModal, getHabitHealth } from '../StreakTaskInsightsModal';

const translations: Record<string, { es: string; en: string }> = {
  'dashboard.streakTaskInsights.recalibration.action.down': { es: '↓ Disminuyó', en: '↓ Decreased' },
  'dashboard.streakTaskInsights.recalibration.action.keep': { es: '• Se mantuvo', en: '• Kept' },
  'dashboard.streakTaskInsights.recalibration.action.up': { es: '↑ Aumentó', en: '↑ Increased' },
  'dashboard.streakTaskInsights.habitHealth.strong': { es: 'Hábito fuerte', en: 'Strong habit' },
  'dashboard.streakTaskInsights.habitHealth.medium': { es: 'Hábito en construcción', en: 'Habit in progress' },
  'dashboard.streakTaskInsights.habitHealth.weak': { es: 'Hábito frágil', en: 'Fragile habit' },
  'dashboard.streakTaskInsights.weeklyProgress.goalReached': {
    es: 'Meta cumplida {{completed}} de {{total}} semanas.',
    en: 'Goal reached in {{completed}} out of {{total}} weeks.',
  },
  'dashboard.streakTaskInsights.recalibration.reason.highCompletion': {
    es: 'La tasa de cumplimiento fue mayor al 80%, el sistema sugirió bajar un nivel de dificultad.',
    en: 'Completion rate was above 80%, so the system suggested decreasing difficulty by one level.',
  },
  'dashboard.streakTaskInsights.recalibration.reason.mediumCompletion': {
    es: 'La tasa de cumplimiento estuvo entre 50% y 79%, por eso la dificultad se mantuvo.',
    en: 'Completion rate was between 50% and 79%, so difficulty was kept.',
  },
  'dashboard.streakTaskInsights.recalibration.reason.lowCompletion': {
    es: 'La tasa de cumplimiento fue menor al 50%, el sistema sugirió subir un nivel de dificultad.',
    en: 'Completion rate was below 50%, so the system suggested increasing difficulty by one level.',
  },
  'dashboard.streakTaskInsights.recalibration.reasonUnknown': {
    es: 'Razón no disponible en tu idioma.',
    en: 'Reason unavailable in your language.',
  },
  'dashboard.streakTaskInsights.recalibration.reasonFallback': {
    es: 'Sin razón detallada disponible.',
    en: 'No detailed reason available.',
  },
  'dashboard.streakTaskInsights.recalibration.empty': { es: 'Aún no hay recalibraciones.', en: 'No recalibrations yet.' },
  'dashboard.streakTaskInsights.weeklyProgress.empty': {
    es: 'Aún no registramos semanas para esta tarea.',
    en: 'No weekly records yet for this task.',
  },
  'dashboard.streakTaskInsights.activity.empty.month': { es: 'Sin registros en este mes.', en: 'No activity records this month.' },
  'dashboard.streakTaskInsights.achievementSeal': { es: '🏅 Logrado', en: '🏅 Achieved' },
  'dashboard.streakTaskInsights.streak.weeksInRow': { es: 'semanas seguidas', en: 'weeks in a row' },
  'dashboard.streakTaskInsights.streak.bestLabel': { es: 'máxima racha lograda', en: 'best streak achieved' },
};

function translate(language: 'es' | 'en', key: string, params?: Record<string, string | number>): string {
  const template = translations[key]?.[language] ?? key;
  return Object.entries(params ?? {}).reduce(
    (acc, [paramKey, value]) => acc.replaceAll(`{{${paramKey}}}`, String(value)),
    template,
  );
}

const languageState = vi.hoisted(() => ({ current: 'es' as 'es' | 'en' }));

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
  usePostLoginLanguage: () => ({
    language: languageState.current,
    t: (key: string, params?: Record<string, string | number>) => translate(languageState.current, key, params),
  }),
}));

vi.mock('../../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/api')>('../../../lib/api');
  return {
    ...actual,
    getTaskInsights: vi.fn(async () => mockInsights),
  };
});

describe('getHabitHealth', () => {
  test('devuelve nivel + label localizado por idioma', () => {
    expect(getHabitHealth(100, 3)).toEqual({ level: 'strong', label: 'Hábito fuerte' });
    expect(getHabitHealth(100, 3, 'en')).toEqual({ level: 'strong', label: 'Strong habit' });
  });

  test('clasifica correctamente hábitos débiles, en construcción y fuertes', () => {
    expect(getHabitHealth(40, 8)).toEqual({ level: 'weak', label: 'Hábito frágil' });
    expect(getHabitHealth(55, 6)).toEqual({ level: 'medium', label: 'Hábito en construcción' });
    expect(getHabitHealth(79, 5)).toEqual({ level: 'medium', label: 'Hábito en construcción' });
    expect(getHabitHealth(80, 12)).toEqual({ level: 'strong', label: 'Hábito fuerte' });
  });
});

describe('TaskInsightsModal i18n', () => {
  test('en español muestra labels y razones de recalibración sin inglés', async () => {
    languageState.current = 'es';
    const insightsWithRecalibration: TaskInsightsResponse = {
      ...mockInsights,
      task: { ...mockInsights.task, achievementSealVisible: true },
      recalibration: {
        eligible: true,
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

    mockUseRequest.mockReturnValueOnce({ data: insightsWithRecalibration, error: null, status: 'success', reload: vi.fn() });

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

    expect(await screen.findByText('↓ Disminuyó')).toBeInTheDocument();
    expect(screen.getByText('• Se mantuvo')).toBeInTheDocument();
    expect(screen.getByText('↑ Aumentó')).toBeInTheDocument();
    expect(screen.getByText('🏅 Logrado')).toBeInTheDocument();
    expect(screen.getByText('Hábito fuerte')).toBeInTheDocument();
    expect(screen.getByText('semanas seguidas')).toBeInTheDocument();
    expect(screen.getByText('máxima racha lograda')).toBeInTheDocument();
    expect(screen.getByText(/La tasa de cumplimiento fue mayor al 80%/)).toBeInTheDocument();
    expect(screen.queryByText('Historical row migrated:')).not.toBeInTheDocument();
    expect(screen.queryByText('Decreased')).not.toBeInTheDocument();
    expect(screen.queryByText('Achieved')).not.toBeInTheDocument();
  });

  test('en inglés muestra labels y razones localizadas sin español', async () => {
    languageState.current = 'en';
    const insightsWithRecalibration: TaskInsightsResponse = {
      ...mockInsights,
      recalibration: {
        eligible: true,
        history: [
          {
            action: 'down',
            periodStart: '2026-02-01',
            expectedTarget: 10,
            completions: 9,
            completionRate: 0.9,
            reason: 'Historical row migrated: completion rate above 80%, system suggested decreasing difficulty by one level.',
          },
        ],
      },
    };

    mockUseRequest.mockReturnValueOnce({ data: insightsWithRecalibration, error: null, status: 'success', reload: vi.fn() });

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
    expect(screen.getByText('Strong habit')).toBeInTheDocument();
    expect(screen.getByText('weeks in a row')).toBeInTheDocument();
    expect(screen.getByText('best streak achieved')).toBeInTheDocument();
    expect(screen.getByText(/Completion rate was above 80%/)).toBeInTheDocument();
    expect(screen.queryByText('Disminuyó')).not.toBeInTheDocument();
    expect(screen.queryByText('Hábito fuerte')).not.toBeInTheDocument();
  });

  test('fallbacks: razón desconocida, sin recalibraciones y sin datos de actividad', async () => {
    languageState.current = 'es';
    const insightsWithFallbacks: TaskInsightsResponse = {
      ...mockInsights,
      task: { ...mockInsights.task, achievementSealVisible: false },
      month: { totalCount: 0, days: [] },
      weeks: { ...mockInsights.weeks, timeline: [] },
      recalibration: {
        eligible: true,
        history: [
          {
            action: 'keep',
            periodStart: '2026-02-01',
            expectedTarget: 10,
            completions: 5,
            completionRate: 0.5,
            reason: 'Historical row migrated: unstructured backend text',
          },
          {
            action: 'up',
            periodStart: '2026-01-01',
            expectedTarget: 10,
            completions: 4,
            completionRate: 0.4,
            reason: null,
          },
        ],
      },
    };

    mockUseRequest.mockReturnValueOnce({ data: insightsWithFallbacks, error: null, status: 'success', reload: vi.fn() });

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

    expect(await screen.findByText('Razón no disponible en tu idioma.')).toBeInTheDocument();
    expect(screen.getByText('Sin razón detallada disponible.')).toBeInTheDocument();
    expect(screen.getByText('Aún no registramos semanas para esta tarea.')).toBeInTheDocument();
    expect(screen.getByText('Sin registros en este mes.')).toBeInTheDocument();
    expect(screen.queryByText('🏅 Logrado')).not.toBeInTheDocument();

    mockUseRequest.mockReturnValueOnce({
      data: { ...mockInsights, recalibration: { eligible: true, history: [] } },
      error: null,
      status: 'success',
      reload: vi.fn(),
    });

    render(
      <TaskInsightsModal
        taskId="task-124"
        weeklyGoal={3}
        mode="Flow"
        range="week"
        onClose={() => {}}
        fallbackTask={{ id: 'task-124', name: 'Nueva tarea', stat: 'Metric' }}
      />,
    );

    expect(await screen.findByText('Aún no hay recalibraciones.')).toBeInTheDocument();
  });
});
