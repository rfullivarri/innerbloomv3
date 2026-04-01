import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyHabitAchievementDecision,
  createPendingHabitAchievement,
  evaluateHabitAchievementWindow,
  runMonthlyHabitAchievementDetection,
  resolveExpiredPendingHabitAchievements,
  toggleAchievedHabitTracking,
} from '../habitAchievementService.js';

type QueryResult = { rows?: unknown[]; rowCount?: number };

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn<Promise<QueryResult>, [string, unknown[]?]>(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: (sql: string, params?: unknown[]) => mockQuery(sql, params),
  },
}));

beforeEach(() => {
  mockQuery.mockReset();
});

describe('habitAchievementService evaluation', () => {
  it('qualifies with weighted 3-month rule and consistency guardrails', () => {
    const result = evaluateHabitAchievementWindow([
      { period_end: '2026-03-31', expected_target: 20, completions_done: 18, completion_rate: 0.9 },
      { period_end: '2026-02-28', expected_target: 20, completions_done: 16, completion_rate: 0.8 },
      { period_end: '2026-01-31', expected_target: 20, completions_done: 14, completion_rate: 0.7 },
    ]);

    expect(result.qualifies).toBe(true);
    expect(result.aggregatedCompletionRate).toBeCloseTo(0.8, 6);
    expect(result.monthsMeetingGoal).toBe(2);
    expect(result.monthsBelowFloor).toBe(0);
  });

  it('fails when a month is below floor even if aggregate reaches threshold', () => {
    const result = evaluateHabitAchievementWindow([
      { period_end: '2026-03-31', expected_target: 10, completions_done: 10, completion_rate: 1.0 },
      { period_end: '2026-02-28', expected_target: 10, completions_done: 8, completion_rate: 0.8 },
      { period_end: '2026-01-31', expected_target: 10, completions_done: 6, completion_rate: 0.4 },
    ]);

    expect(result.qualifies).toBe(false);
    expect(result.reason).toBe('month_below_floor');
  });

  it('supports configurable thresholds', () => {
    const result = evaluateHabitAchievementWindow(
      [
        { period_end: '2026-03-31', expected_target: 10, completions_done: 7, completion_rate: 0.7 },
        { period_end: '2026-02-28', expected_target: 10, completions_done: 7, completion_rate: 0.7 },
        { period_end: '2026-01-31', expected_target: 10, completions_done: 7, completion_rate: 0.7 },
      ],
      { aggregateThreshold: 0.7, monthlyGoalThreshold: 0.7, minimumMonthsMeetingGoal: 3, floorThreshold: 0.6 },
    );

    expect(result.qualifies).toBe(true);
  });
});

describe('habitAchievementService lifecycle transitions', () => {
  it('persists pending expiration when creating pending achievement', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const now = new Date('2026-03-31T12:00:00.000Z');

    const output = await createPendingHabitAchievement({
      taskId: 'task-1',
      userId: 'user-1',
      now,
      evaluation: {
        qualifies: true,
        reason: null,
        windowMonths: 3,
        aggregatedExpectedTarget: 60,
        aggregatedCompletionsDone: 48,
        aggregatedCompletionRate: 0.8,
        monthsEvaluated: 3,
        monthsMeetingGoal: 2,
        monthsBelowFloor: 0,
        detectedPeriodEnd: '2026-03-31',
      },
    });

    expect(output.pendingExpiresAt.toISOString()).toBe('2026-04-10T12:00:00.000Z');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO task_habit_achievements'), expect.any(Array));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE tasks'), expect.any(Array));
  });

  it('resolves expired pending records back to active', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            task_habit_achievement_id: 'achievement-1',
            task_id: 'task-1',
            user_id: 'user-1',
            pending_expires_at: '2026-03-30T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const expired = await resolveExpiredPendingHabitAchievements(new Date('2026-03-31T00:00:00.000Z'));

    expect(expired).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("status = 'expired_pending'"), expect.any(Array));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('lifecycle_status = $3'), expect.any(Array));
  });

  it('applies maintain/store transitions and preserves achievement record for toggling', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            task_habit_achievement_id: 'achievement-1',
            status: 'pending_decision',
            pending_expires_at: '2026-04-05T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_habit_achievement_id: 'achievement-1',
            status: 'maintained',
            pending_expires_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await applyHabitAchievementDecision({
      taskId: 'task-1',
      userId: 'user-1',
      decision: 'maintain',
      now: new Date('2026-03-31T00:00:00.000Z'),
    });

    await toggleAchievedHabitTracking({
      taskId: 'task-1',
      userId: 'user-1',
      maintainEnabled: false,
    });

    const updateCalls = mockQuery.mock.calls.filter((entry) => (entry[0] as string).includes('UPDATE task_habit_achievements'));
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[0]?.[1]).toEqual(expect.arrayContaining(['achievement-1', 'maintained']));
    expect(updateCalls[1]?.[1]).toEqual(expect.arrayContaining(['achievement-1', 'stored']));
  });

  it('runs monthly detection after aggregation window and creates pending records for qualified tasks', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ task_id: 'task-1', user_id: 'user-1' }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { period_end: '2026-03-31', expected_target: 20, completions_done: 18, completion_rate: 0.9 },
          { period_end: '2026-02-28', expected_target: 20, completions_done: 16, completion_rate: 0.8 },
          { period_end: '2026-01-31', expected_target: 20, completions_done: 14, completion_rate: 0.7 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await runMonthlyHabitAchievementDetection({
      periodStart: '2026-03-01',
      nextPeriodStart: '2026-04-01',
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(result).toEqual({
      expiredResolved: 0,
      evaluated: 1,
      pendingCreated: 1,
    });
  });
});
