import { describe, expect, it, vi } from 'vitest';

vi.mock('config/emotion_messages.json', () => ({ default: {} }));
vi.mock('../api', () => ({
  getTaskInsights: vi.fn(),
}));

import type { AdminInsights, AdminLogRow } from '../types';
import type { TaskInsightsResponse } from '../api';
import { getTaskInsights } from '../api';
import { buildWeeklyWrappedFromData, normalizeLogs, summarizeWeeklyActivity } from '../weeklyWrapped';

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

  it('uses the weeksSample provided by task insights when hydrating habits', async () => {
    const mockTaskInsights: TaskInsightsResponse = {
      task: { id: 'task-1', name: 'Ayuno', stat: null, description: null },
      month: { totalCount: 0, days: [] },
      weeks: {
        weeklyGoal: 3,
        completionRate: 83,
        weeksSample: 12,
        currentStreak: 2,
        bestStreak: 9,
        timeline: [
          { weekStart: '2024-11-04', weekEnd: '2024-11-10', count: 3, hit: true },
          { weekStart: '2024-11-11', weekEnd: '2024-11-17', count: 2, hit: true },
        ],
      },
    };

    vi.mocked(getTaskInsights).mockResolvedValue(mockTaskInsights);

    const adminInsights: AdminInsights = {
      profile: { id: 'user-1', email: 'test@example.com', name: 'Tester', gameMode: 'standard', createdAt: '2024-01-01' },
      level: { level: 5, xpCurrent: 0, xpToNext: 100 },
      xp: { total: 0, last30d: 0, last90d: 0, byPillar: { body: 40, mind: 20, soul: 10 } },
      streaks: { dailyCurrent: 0, weeklyCurrent: 0, longest: 0 },
      constancyWeekly: { body: 60, mind: 20, soul: 10 },
      emotions: { last7: [], last30: [], top3: [] },
    };

    const logs: AdminLogRow[] = [
      {
        date: '2024-11-05',
        week: '2024-W45',
        pillar: 'Body',
        trait: 'Energy',
        taskId: 'task-1',
        taskName: 'Ayuno',
        difficulty: 'medium',
        xp: 10,
        state: 'green',
        timesInRange: 1,
        source: 'form',
        stat: null,
        notes: null,
      },
      {
        date: '2024-11-07',
        week: '2024-W45',
        pillar: 'Body',
        trait: 'Energy',
        taskId: 'task-1',
        taskName: 'Ayuno',
        difficulty: 'medium',
        xp: 10,
        state: 'green',
        timesInRange: 1,
        source: 'form',
        stat: null,
        notes: null,
      },
    ];

    const payload = await buildWeeklyWrappedFromData(adminInsights, logs, [], null);

    const habitsSection = payload.sections.find((section) => section.key === 'habits');
    const hydratedHabit = habitsSection?.items?.[0];

    expect(hydratedHabit?.weeksSample).toBe(12);
    expect(hydratedHabit?.completionRate).toBe(83);
  });
});
