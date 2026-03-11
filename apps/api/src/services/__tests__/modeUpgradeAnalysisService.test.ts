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
    expect(result.reason_if_empty).toBe('no_active_tasks');
    expect(result.tasks_total_evaluated).toBe(0);
    expect(result.missing_tasks).toBeNull();
    expect(result.cta_enabled).toBe(false);
    expect(result.next_mode).toBeNull();
  });

  it('returns no_mode_baseline when tasks exist but there is no user mode/history baseline', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u') && sql.includes('current_weekly_target'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: null, current_mode: null, current_weekly_target: null }] }),
      },
      {
        match: (sql) => sql.includes('FROM tasks t') && sql.includes('t.active = TRUE'),
        handle: () => ({ rows: [{ task_id: 'task-1', task_name: 'Task 1', created_at: '2024-12-01T00:00:00.000Z' }] }),
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
    expect(result.reason_if_empty).toBe('no_mode_baseline');
    expect(result.tasks).toEqual([]);
    expect(result.missing_tasks).toBeNull();
    expect(result.cta_enabled).toBe(false);
  });

  it('returns all_expected_zero when baseline exists but weekly target resolves to zero', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u') && sql.includes('current_weekly_target'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 1, current_mode: 'LOW', current_weekly_target: 0 }] }),
      },
      {
        match: (sql) => sql.includes('FROM tasks t') && sql.includes('t.active = TRUE'),
        handle: () => ({ rows: [{ task_id: 'task-1', task_name: 'Task 1', created_at: '2024-12-01T00:00:00.000Z' }] }),
      },
      {
        match: (sql) => sql.includes('GROUP BY dl.task_id'),
        handle: () => ({ rows: [{ task_id: 'task-1', actual_count: 3 }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_history h') && sql.includes('gm.weekly_target'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getRollingModeUpgradeAnalysis('u1', new Date('2025-01-31T12:00:00.000Z'));

    expect(result.has_analysis).toBe(false);
    expect(result.reason_if_empty).toBe('all_expected_zero');
    expect(result.tasks_total_evaluated).toBe(0);
    expect(result.missing_tasks).toBeNull();
  });

  it('keeps tasks[] consistent with aggregate and includes zero-completion tasks', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u') && sql.includes('current_weekly_target'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 2, current_mode: 'CHILL', current_weekly_target: 4 }] }),
      },
      {
        match: (sql) => sql.includes('FROM tasks t') && sql.includes('t.active = TRUE'),
        handle: () => ({
          rows: [
            { task_id: 'task-1', task_name: 'Task 1', created_at: '2024-12-01T00:00:00.000Z' },
            { task_id: 'task-2', task_name: 'Task 2', created_at: '2024-12-01T00:00:00.000Z' },
          ],
        }),
      },
      {
        match: (sql) => sql.includes('GROUP BY dl.task_id'),
        handle: () => ({ rows: [{ task_id: 'task-1', actual_count: 18 }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_history h') && sql.includes('gm.weekly_target'),
        handle: () => ({ rows: [{ game_mode_id: 2, effective_at: '2024-12-15T00:00:00.000Z', mode_code: 'CHILL', weekly_target: 4 }] }),
      },
    ]);

    const result = await getRollingModeUpgradeAnalysis('u1', new Date('2025-01-31T12:00:00.000Z'));

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.find((task) => task.task_id === 'task-2')?.actual_count).toBe(0);
    expect(result.tasks_total_evaluated).toBe(result.tasks.length);
    expect(result.tasks_meeting_goal).toBe(result.tasks.filter((task) => task.meets_goal).length);
  });
});
