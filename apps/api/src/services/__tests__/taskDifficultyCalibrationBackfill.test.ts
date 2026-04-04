import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { rows?: unknown[]; rowCount?: number };

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn<Promise<QueryResult>, [string, unknown[]?]>(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: (sql: string, params?: unknown[]) => mockQuery(sql, params),
  },
}));

import { runMonthlyTaskDifficultyCalibrationBackfill } from '../taskDifficultyCalibrationService.js';

describe('runMonthlyTaskDifficultyCalibrationBackfill', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('uses users.deleted_at filter (not tasks.deleted_at) for backfill task selection', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await runMonthlyTaskDifficultyCalibrationBackfill({ now: new Date('2026-04-02T00:00:00.000Z') });

    const firstSql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    expect(firstSql).toContain('FROM tasks t');
    expect(firstSql).toContain('JOIN users u ON u.user_id = t.user_id');
    expect(firstSql).toContain('WHERE u.deleted_at IS NULL');
    expect(firstSql).not.toContain('t.deleted_at');
  });

  it('applies optional user filter to backfill task selection query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await runMonthlyTaskDifficultyCalibrationBackfill({
      userId: '00000000-0000-4000-8000-000000000001',
      now: new Date('2026-04-02T00:00:00.000Z'),
    });

    const firstSql = String(mockQuery.mock.calls[0]?.[0] ?? '');
    const firstParams = mockQuery.mock.calls[0]?.[1];

    expect(firstSql).toContain('AND t.user_id = $1::uuid');
    expect(firstParams).toEqual(['00000000-0000-4000-8000-000000000001']);
  });

  it('skips historical periods when historical game mode context is missing', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM tasks t') && sql.includes('WHERE u.deleted_at IS NULL')) {
        return {
          rows: [
            {
              task_id: 'task-1',
              user_id: 'user-1',
              created_at: '2025-01-01T00:00:00.000Z',
              difficulty_id: 2,
              game_mode_id: 3,
            },
          ],
        };
      }

      if (sql.includes('FROM task_difficulty_recalibrations')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_game_mode_history h')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO task_difficulty_recalibrations')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await runMonthlyTaskDifficultyCalibrationBackfill({
      now: new Date('2026-04-02T00:00:00.000Z'),
    });

    expect(result.periodsInserted).toBe(0);
    expect(result.periodsSkippedMissingTarget).toBeGreaterThan(0);
    expect(
      mockQuery.mock.calls.some(([sql]) => String(sql).includes('SELECT weekly_target FROM cat_game_mode WHERE game_mode_id = $1')),
    ).toBe(false);
  });
});
