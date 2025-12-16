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
});
