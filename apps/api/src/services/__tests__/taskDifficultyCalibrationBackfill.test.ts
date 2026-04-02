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
});
