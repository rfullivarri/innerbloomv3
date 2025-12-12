import { describe, expect, it, vi } from 'vitest';

vi.mock('config/emotion_messages.json', () => ({ default: {} }));

import type { AdminLogRow } from '../types';
import { normalizeLogs, summarizeWeeklyActivity } from '../weeklyWrapped';

describe('weeklyWrapped data consistency', () => {
  it('counts unique active days per habit and uses quantity as completions', () => {
    const logs: AdminLogRow[] = [
      {
        date: '2024-08-01',
        week: '2024-W31',
        pillar: 'Mind',
        trait: 'Focus',
        taskId: 'task-1',
        taskName: 'Meditación',
        difficulty: 'easy',
        xp: 10,
        state: 'green',
        timesInRange: 2,
        source: 'form',
        stat: null,
        notes: null,
      },
      {
        date: '2024-08-01',
        week: '2024-W31',
        pillar: 'Mind',
        trait: 'Focus',
        taskId: 'task-1',
        taskName: 'Meditación',
        difficulty: 'easy',
        xp: 10,
        state: 'green',
        timesInRange: 1,
        source: 'form',
        stat: null,
        notes: null,
      },
      {
        date: '2024-08-03',
        week: '2024-W31',
        pillar: 'Mind',
        trait: 'Focus',
        taskId: 'task-1',
        taskName: 'Meditación',
        difficulty: 'easy',
        xp: 10,
        state: 'yellow',
        timesInRange: 1,
        source: 'form',
        stat: null,
        notes: null,
      },
      {
        date: '2024-08-04',
        week: '2024-W31',
        pillar: 'Mind',
        trait: 'Focus',
        taskId: 'task-1',
        taskName: 'Meditación',
        difficulty: 'easy',
        xp: 0,
        state: 'red',
        timesInRange: 5,
        source: 'form',
        stat: null,
        notes: null,
      },
    ];

    const normalized = normalizeLogs(logs);
    const { completions, habitCounts } = summarizeWeeklyActivity(normalized);

    expect(completions).toBe(4);
    expect(habitCounts).toHaveLength(1);
    expect(habitCounts[0]).toMatchObject({ daysActive: 2, completions: 4, title: 'Meditación' });
  });
});
