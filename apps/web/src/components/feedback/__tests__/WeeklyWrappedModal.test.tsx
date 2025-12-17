import { describe, expect, test } from 'vitest';

import { resolveHabitHealth, type HabitItem } from '../WeeklyWrappedModal';

describe('resolveHabitHealth', () => {
  const baseHabit: Pick<HabitItem, 'title' | 'body'> = {
    title: 'Meditación',
    body: 'Detalles',
  };

  test('interpreta weeksSample como string sin marcar el hábito como temprano', () => {
    const health = resolveHabitHealth({
      ...baseHabit,
      weeksActive: 5,
      weeksSample: '6',
    });

    expect(health.label).not.toBe('Aún es pronto para medir');
    expect(health.level).toBe('strong');
  });

  test('usa weeksActive como muestra mínima cuando weeksSample está ausente', () => {
    const health = resolveHabitHealth({
      ...baseHabit,
      weeksActive: 4,
      daysActive: 3,
      weeksSample: undefined,
    });

    expect(health.label).not.toBe('Aún es pronto para medir');
    expect(health.level).toBe('strong');
  });

  test('prefiere la tasa de completionRate provista (popup) para calcular la salud', () => {
    const health = resolveHabitHealth({
      ...baseHabit,
      completionRate: 83,
      weeksActive: 8,
      weeksSample: 10,
      daysActive: 2,
    });

    expect(health.level).toBe('strong');
  });

  test('usa la actividad diaria como respaldo cuando no hay datos de semanas', () => {
    const health = resolveHabitHealth({
      ...baseHabit,
      daysActive: 5,
      weeksActive: undefined,
      weeksSample: undefined,
    });

    expect(health.weeksActive).toBe(1);
    expect(health.weeksSample).toBe(1);
  });

  test('replica la lógica del modal de insights excluyendo la semana actual', () => {
    const today = new Date('2024-06-10T12:00:00Z');
    const health = resolveHabitHealth(
      {
        ...baseHabit,
        weeksSample: 4,
        completionRate: 75,
        insightsTimeline: [
          { weekStart: '2024-05-13', weekEnd: '2024-05-19', count: 1, hit: true },
          { weekStart: '2024-05-20', weekEnd: '2024-05-26', count: 1, hit: true },
          { weekStart: '2024-05-27', weekEnd: '2024-06-02', count: 0, hit: false },
          { weekStart: '2024-06-03', weekEnd: '2024-06-09', count: 1, hit: true },
          { weekStart: '2024-06-10', weekEnd: '2024-06-16', count: 0, hit: false },
        ],
      },
      today,
    );

    expect(health.completionRatePct).toBe(75);
    expect(health.weeksSample).toBe(4);
    expect(health.weeksActive).toBe(3);
    expect(health.label).toBe('Hábito en construcción');
  });
});
