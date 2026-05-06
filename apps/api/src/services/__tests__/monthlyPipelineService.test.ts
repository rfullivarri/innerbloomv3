import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockQuery,
  mockRunMonthlyCalibration,
  mockRunMonthlyCalibrationForUser,
  mockRunModeUpgradeAggregation,
  mockRunMonthlyHabitAchievementDetection,
} = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockRunMonthlyCalibration: vi.fn(async () => ({
    evaluated: 10,
    adjusted: 2,
    skipped: 1,
    ignored: 0,
    actionBreakdown: { up: 1, keep: 7, down: 2 },
    errors: [],
  })),
  mockRunMonthlyCalibrationForUser: vi.fn(async () => ({
    evaluated: 1,
    adjusted: 1,
    skipped: 0,
    ignored: 0,
    actionBreakdown: { up: 0, keep: 0, down: 1 },
    errors: [],
  })),
  mockRunModeUpgradeAggregation: vi.fn(async (options: { periodKey: string; userId?: string }) => ({
    periodKey: options.periodKey,
    periodStart: '2026-04-01',
    nextPeriodStart: '2026-05-01',
    scope: options.userId ? 'single_user' : 'all_users',
    processed: options.userId ? 1 : 5,
    persisted: options.userId ? 1 : 5,
  })),
  mockRunMonthlyHabitAchievementDetection: vi.fn(async () => ({
    expiredResolved: 0,
    evaluated: 1,
    qualified: 1,
    pendingCreated: 1,
    skipped: 0,
    ignored: 0,
    errors: 0,
    outcomes: [
      {
        taskId: 'task-1',
        userId: '00000000-0000-4000-8000-000000000001',
        outcome: 'qualified_pending_created',
        reason: null,
        detectedPeriodEnd: '2026-04-30',
        monthsEvaluated: 3,
        sources: ['cron'],
      },
    ],
  })),
}));

vi.mock('../../db.js', () => ({
  pool: { query: (...args: unknown[]) => mockQuery(...args) },
}));

vi.mock('../taskDifficultyCalibrationService.js', () => ({
  runMonthlyTaskDifficultyCalibration: (...args: unknown[]) => mockRunMonthlyCalibration(...args),
  runMonthlyTaskDifficultyCalibrationForUser: (...args: unknown[]) => mockRunMonthlyCalibrationForUser(...args),
}));

vi.mock('../modeUpgradeMonthlyAggregationService.js', () => ({
  runUserMonthlyModeUpgradeAggregation: (...args: unknown[]) => mockRunModeUpgradeAggregation(...args),
}));

vi.mock('../habitAchievementService.js', () => ({
  runMonthlyHabitAchievementDetection: (...args: unknown[]) => mockRunMonthlyHabitAchievementDetection(...args),
}));

import { runMonthlyPipelineForPeriod } from '../monthlyPipelineService.js';

describe('runMonthlyPipelineForPeriod', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRunMonthlyCalibration.mockClear();
    mockRunMonthlyCalibrationForUser.mockClear();
    mockRunModeUpgradeAggregation.mockClear();
    mockRunMonthlyHabitAchievementDetection.mockClear();
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.includes('SELECT status, attempt_count FROM monthly_pipeline_runs')) {
        return { rows: [{ status: 'succeeded', attempt_count: 1 }] };
      }
      return { rows: [] };
    });
  });

  it('reruns a succeeded period with force=true for all users', async () => {
    const now = new Date('2026-05-06T00:00:00.000Z');
    const result = await runMonthlyPipelineForPeriod({ periodKey: '2026-04', force: true, now });

    expect(result).toMatchObject({ periodKey: '2026-04', attempt: 2, userId: null });
    expect(mockRunMonthlyCalibration).toHaveBeenCalledWith(now);
    expect(mockRunMonthlyCalibrationForUser).not.toHaveBeenCalled();
    expect(mockRunModeUpgradeAggregation).toHaveBeenCalledWith({ now, periodKey: '2026-04', userId: undefined });
    expect(mockRunMonthlyHabitAchievementDetection).toHaveBeenCalledWith({
      now,
      periodStart: '2026-04-01',
      nextPeriodStart: '2026-05-01',
      userId: undefined,
    });
  });

  it('propagates userId to user-scoped monthly stages', async () => {
    const now = new Date('2026-05-06T00:00:00.000Z');
    const userId = '00000000-0000-4000-8000-000000000001';
    const result = await runMonthlyPipelineForPeriod({ periodKey: '2026-04', force: true, userId, now });

    expect(result).toMatchObject({ periodKey: '2026-04', attempt: 2, userId });
    expect(mockRunMonthlyCalibration).not.toHaveBeenCalled();
    expect(mockRunMonthlyCalibrationForUser).toHaveBeenCalledWith({ userId, now });
    expect(mockRunModeUpgradeAggregation).toHaveBeenCalledWith({ now, periodKey: '2026-04', userId });
    expect(mockRunMonthlyHabitAchievementDetection).toHaveBeenCalledWith({
      now,
      periodStart: '2026-04-01',
      nextPeriodStart: '2026-05-01',
      userId,
    });
  });
});
