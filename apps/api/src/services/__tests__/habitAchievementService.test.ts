import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyHabitAchievementDecision,
  createPendingHabitAchievement,
  evaluateHabitAchievementWindow,
  evaluateTaskHabitAchievement,
  runRetroactiveHabitAchievementDetection,
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

  it('keeps monthly source policy strict to cron by default', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await evaluateTaskHabitAchievement({ taskId: 'task-1' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('source = ANY($3::text[])'),
      expect.arrayContaining(['task-1', expect.any(Number), ['cron']]),
    );
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

  it('runs retroactive detection with admin summary counters', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: true,
            current_excluded_from_habit_achievement: false,
          },
          {
            task_id: 'task-2',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: true,
            current_excluded_from_habit_achievement: false,
          },
          {
            task_id: 'task-3',
            user_id: 'user-1',
            has_allowed_source_history: false,
            current_active: true,
            current_excluded_from_habit_achievement: false,
          },
        ],
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
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ task_habit_achievement_id: 'achievement-existing', status: 'maintained', pending_expires_at: null }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { period_end: '2026-03-31', expected_target: 20, completions_done: 2, completion_rate: 0.1 },
          { period_end: '2026-02-28', expected_target: 20, completions_done: 1, completion_rate: 0.05 },
          { period_end: '2026-01-31', expected_target: 20, completions_done: 0, completion_rate: 0.0 },
        ],
      });

    const result = await runRetroactiveHabitAchievementDetection({
      now: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(result).toEqual({
      scope: 'all_users',
      userId: null,
      expiredResolved: 0,
      rawHistoricalCandidates: 3,
      droppedBySource: 1,
      droppedByLifecycleCurrentState: 0,
      candidatesConsidered: 2,
      evaluated: 1,
      qualified: 1,
      pendingCreated: 1,
      skipped: 1,
      ignored: 0,
      errors: 0,
      ignoredByEvaluationReason: {
        insufficient_periods: 0,
        non_consecutive_periods: 0,
        expected_target_zero: 0,
        aggregate_below_threshold: 0,
        insufficient_goal_months: 0,
        month_below_floor: 0,
      },
      ignoredEvaluationPreview: [],
    });
  });

  it('retroactive run evaluates historical cron candidates even when current task state is inactive/excluded', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-historical',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: false,
            current_excluded_from_habit_achievement: true,
          },
        ],
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

    const result = await runRetroactiveHabitAchievementDetection({
      now: new Date('2026-04-01T00:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      scope: 'single_user',
      userId: '11111111-1111-4111-8111-111111111111',
      expiredResolved: 0,
      rawHistoricalCandidates: 1,
      droppedBySource: 0,
      droppedByLifecycleCurrentState: 1,
      candidatesConsidered: 1,
      evaluated: 1,
      qualified: 1,
      pendingCreated: 1,
      skipped: 0,
      ignored: 0,
      errors: 0,
      ignoredByEvaluationReason: {
        insufficient_periods: 0,
        non_consecutive_periods: 0,
        expected_target_zero: 0,
        aggregate_below_threshold: 0,
        insufficient_goal_months: 0,
        month_below_floor: 0,
      },
      ignoredEvaluationPreview: [],
    });
  });

  it('retroactive run evaluates historical admin_run-only candidates for backfill', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-admin-history',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: true,
            current_excluded_from_habit_achievement: false,
          },
        ],
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

    const result = await runRetroactiveHabitAchievementDetection({
      now: new Date('2026-04-01T00:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      scope: 'single_user',
      userId: '11111111-1111-4111-8111-111111111111',
      expiredResolved: 0,
      rawHistoricalCandidates: 1,
      droppedBySource: 0,
      droppedByLifecycleCurrentState: 0,
      candidatesConsidered: 1,
      evaluated: 1,
      qualified: 1,
      pendingCreated: 1,
      skipped: 0,
      ignored: 0,
      errors: 0,
      ignoredByEvaluationReason: {
        insufficient_periods: 0,
        non_consecutive_periods: 0,
        expected_target_zero: 0,
        aggregate_below_threshold: 0,
        insufficient_goal_months: 0,
        month_below_floor: 0,
      },
      ignoredEvaluationPreview: [],
    });

    const evaluationCall = mockQuery.mock.calls.find((entry) =>
      (entry[0] as string).includes('source = ANY($3::text[])'),
    );
    expect(evaluationCall?.[1]).toEqual(
      expect.arrayContaining([expect.any(String), expect.any(Number), ['cron', 'admin_run']]),
    );
  });

  it('returns all-zero processing counters only when there is no historical basis to consider', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await runRetroactiveHabitAchievementDetection({
      now: new Date('2026-04-01T00:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result).toEqual({
      scope: 'single_user',
      userId: '11111111-1111-4111-8111-111111111111',
      expiredResolved: 0,
      rawHistoricalCandidates: 0,
      droppedBySource: 0,
      droppedByLifecycleCurrentState: 0,
      candidatesConsidered: 0,
      evaluated: 0,
      qualified: 0,
      pendingCreated: 0,
      skipped: 0,
      ignored: 0,
      errors: 0,
      ignoredByEvaluationReason: {
        insufficient_periods: 0,
        non_consecutive_periods: 0,
        expected_target_zero: 0,
        aggregate_below_threshold: 0,
        insufficient_goal_months: 0,
        month_below_floor: 0,
      },
      ignoredEvaluationPreview: [],
    });
  });

  it('collects ignored evaluation diagnostics with reason breakdown and preview', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-floor',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: true,
            current_excluded_from_habit_achievement: false,
            current_task_name: 'Sleep early',
          },
          {
            task_id: 'task-goal',
            user_id: 'user-1',
            has_allowed_source_history: true,
            current_active: true,
            current_excluded_from_habit_achievement: false,
            current_task_name: 'Read',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { period_end: '2026-03-31', expected_target: 10, completions_done: 10, completion_rate: 1.0 },
          { period_end: '2026-02-28', expected_target: 10, completions_done: 8, completion_rate: 0.8 },
          { period_end: '2026-01-31', expected_target: 10, completions_done: 3, completion_rate: 0.3 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { period_end: '2026-03-31', expected_target: 100, completions_done: 100, completion_rate: 1.0 },
          { period_end: '2026-02-28', expected_target: 10, completions_done: 7.9, completion_rate: 0.79 },
          { period_end: '2026-01-31', expected_target: 10, completions_done: 7.9, completion_rate: 0.79 },
        ],
      });

    const result = await runRetroactiveHabitAchievementDetection({
      now: new Date('2026-04-01T00:00:00.000Z'),
      userId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.ignored).toBe(2);
    expect(result.ignoredByEvaluationReason).toEqual({
      insufficient_periods: 0,
      non_consecutive_periods: 0,
      expected_target_zero: 0,
      aggregate_below_threshold: 0,
      insufficient_goal_months: 1,
      month_below_floor: 1,
    });
    expect(result.ignoredEvaluationPreview).toEqual([
      expect.objectContaining({
        taskId: 'task-floor',
        taskName: 'Sleep early',
        failureReason: 'month_below_floor',
        monthsEvaluated: 3,
        monthsMeetingGoal: 2,
        monthsBelowFloor: 1,
        detectedPeriodEnd: '2026-03-31',
      }),
      expect.objectContaining({
        taskId: 'task-goal',
        taskName: 'Read',
        failureReason: 'insufficient_goal_months',
        monthsEvaluated: 3,
        monthsMeetingGoal: 1,
        monthsBelowFloor: 0,
        detectedPeriodEnd: '2026-03-31',
      }),
    ]);
  });
});
