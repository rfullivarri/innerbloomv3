import { describe, expect, test } from 'vitest';
import type { TaskInsightsResponse } from '../api';

describe('TaskInsightsResponse previewAchievement typing', () => {
  test('accepts backend recentMonths payload shape with projected current month fields', () => {
    const payload: TaskInsightsResponse = {
      task: {
        id: 'task-1',
        name: 'Hydrate',
        stat: null,
        description: null,
      },
      month: { totalCount: 0, days: [] },
      weeks: {
        weeklyGoal: 4,
        completionRate: 0.75,
        currentStreak: 1,
        bestStreak: 3,
        timeline: [],
      },
      previewAchievement: {
        score: 68,
        status: 'building',
        recentMonths: [
          {
            periodKey: '2026-04',
            closed: false,
            completionRate: 0.52,
            projectedCompletionRate: 0.78,
            state: 'projected_floor_only',
          },
          {
            periodKey: '2026-03',
            closed: true,
            completionRate: 0.84,
            projectedCompletionRate: null,
            state: 'valid',
          },
        ],
      },
    };

    expect(payload.previewAchievement?.recentMonths?.[0]?.projectedCompletionRate).toBe(0.78);
    expect(payload.previewAchievement?.recentMonths?.[1]?.completionRate).toBe(0.84);
  });
});
