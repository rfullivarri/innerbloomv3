import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRollingModeUpgradeAnalysis } from '../modeUpgradeAnalysisService.js';

type QueryResult = { rows?: unknown[]; rowCount?: number };

type Expectation = {
  match: (sql: string) => boolean;
  handle: (sql: string, params?: unknown[]) => QueryResult;
};

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

function queueExpectations(expectations: Expectation[]) {
  mockQuery.mockImplementation(async (sql: string, params?: unknown[]) => {
    const expectation = expectations.shift();

    if (!expectation) {
      throw new Error(`Unexpected query: ${sql}`);
    }

    expect(expectation.match(sql)).toBe(true);
    return expectation.handle(sql, params);
  });
}

describe('modeUpgradeAnalysisService', () => {
  it('uses mode history segments across rolling 30-day window', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u') && sql.includes('current_weekly_target'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 3, current_mode: 'FLOW', current_weekly_target: 7 }] }),
      },
      {
        match: (sql) => sql.includes('FROM tasks t') && sql.includes('t.active = TRUE'),
        handle: () => ({ rows: [{ task_id: 'task-1', task_name: 'Task 1', created_at: '2024-12-01T00:00:00.000Z' }] }),
      },
      {
        match: (sql) => sql.includes('GROUP BY dl.task_id'),
        handle: () => ({ rows: [{ task_id: 'task-1', actual_count: 20 }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_history h') && sql.includes('gm.weekly_target'),
        handle: () => ({
          rows: [
            { game_mode_id: 2, effective_at: '2025-01-02T00:00:00.000Z', mode_code: 'CHILL', weekly_target: 4 },
            { game_mode_id: 3, effective_at: '2025-01-15T00:00:00.000Z', mode_code: 'FLOW', weekly_target: 7 },
          ],
        }),
      },
    ]);

    const result = await getRollingModeUpgradeAnalysis('u1', new Date('2025-01-31T12:00:00.000Z'));

    expect(result.has_analysis).toBe(true);
    expect(result.tasks_total_evaluated).toBe(1);
    expect(result.tasks[0]?.expected_count).toBeCloseTo(24.4286, 4);
    expect(result.tasks[0]?.mode_segments_used).toEqual([
      expect.objectContaining({ start: '2025-01-02', end: '2025-01-14', mode_code: 'CHILL', days: 13 }),
      expect.objectContaining({ start: '2025-01-15', end: '2025-01-31', mode_code: 'FLOW', days: 17 }),
    ]);
    expect(result.eligible_for_upgrade).toBe(true);
    expect(result.cta_enabled).toBe(true);
  });

  it('returns no-analysis payload when no tasks are evaluable', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u') && sql.includes('current_weekly_target'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 4, current_mode: 'EVOLVE', current_weekly_target: 9 }] }),
      },
      {
        match: (sql) => sql.includes('FROM tasks t') && sql.includes('t.active = TRUE'),
        handle: () => ({ rows: [] }),
      },
      {
        match: (sql) => sql.includes('GROUP BY dl.task_id'),
        handle: () => ({ rows: [] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_history h') && sql.includes('gm.weekly_target'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getRollingModeUpgradeAnalysis('u1', new Date('2025-01-31T12:00:00.000Z'));

    expect(result.has_analysis).toBe(false);
    expect(result.debug_reason).toBe('no_evaluable_tasks');
    expect(result.tasks_total_evaluated).toBe(0);
    expect(result.missing_tasks).toBeNull();
    expect(result.cta_enabled).toBe(false);
    expect(result.next_mode).toBeNull();
  });
});
