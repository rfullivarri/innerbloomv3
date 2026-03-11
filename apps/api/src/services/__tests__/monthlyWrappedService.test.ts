import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockInsertMonthlyWrapped, mockTrimMonthlyWrappedHistory, mockListRecentMonthlyWrapped } =
  vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockInsertMonthlyWrapped: vi.fn(),
    mockTrimMonthlyWrappedHistory: vi.fn(),
    mockListRecentMonthlyWrapped: vi.fn(),
  }));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../repositories/monthly-wrapped.repository.js', () => ({
  insertMonthlyWrapped: mockInsertMonthlyWrapped,
  trimMonthlyWrappedHistory: mockTrimMonthlyWrappedHistory,
  listRecentMonthlyWrapped: mockListRecentMonthlyWrapped,
}));

import { buildAndPersistMonthlyWrapped, getRewardsHistoryMonthlyWrapups } from '../monthlyWrappedService.js';

describe('monthlyWrappedService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockInsertMonthlyWrapped.mockReset();
    mockTrimMonthlyWrappedHistory.mockReset();
    mockListRecentMonthlyWrapped.mockReset();
  });

  it('builds and persists payload with close message when not eligible', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tasks_completed: 11, xp_gained: 480 }] })
      .mockResolvedValueOnce({ rows: [{ dominant_pillar: 'MIND', tasks_completed: 6 }] });

    mockInsertMonthlyWrapped.mockImplementation(async ({ userId, periodKey, payload }) => ({
      id: 'id-1',
      userId,
      periodKey,
      payload,
      summary: null,
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    }));

    const result = await buildAndPersistMonthlyWrapped({
      userId: '11111111-2222-3333-4444-555555555555',
      periodKey: '2026-02',
      periodStart: '2026-02-01',
      nextPeriodStart: '2026-03-01',
      currentMode: 'CHILL',
      modeWeeklyTarget: 2,
      tasksTotalEvaluated: 10,
      tasksMeetingGoal: 7,
      taskPassRate: 0.7,
      eligibleForUpgrade: false,
      suggestedNextMode: null,
    });

    expect(result.payload.slide_2).toEqual({
      title: 'you_were_close',
      message: 'You were close',
      missingTasksToUpgrade: 1,
    });
    expect(result.payload.monthly_kpis.tasksCompleted).toBe(11);
    expect(mockTrimMonthlyWrappedHistory).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555', 2);
  });

  it('returns rewards history monthly wrapups limited to 2 items', async () => {
    mockListRecentMonthlyWrapped.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await getRewardsHistoryMonthlyWrapups('user-id');
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    expect(mockListRecentMonthlyWrapped).toHaveBeenCalledWith('user-id', 2);
  });
});
