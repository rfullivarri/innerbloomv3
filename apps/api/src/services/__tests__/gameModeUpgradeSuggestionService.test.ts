import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  getGameModeUpgradeSuggestion,
  resolveNextGameModeCode,
} from '../gameModeUpgradeSuggestionService.js';

type QueryResult = { rows?: unknown[]; rowCount?: number };

type Expectation = {
  match: (sql: string) => boolean;
  handle: (sql: string, params?: unknown[]) => QueryResult;
};

const { mockQuery, mockRollingAnalysis } = vi.hoisted(() => ({
  mockQuery: vi.fn<Promise<QueryResult>, [string, unknown[]?]>(),
  mockRollingAnalysis: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: (sql: string, params?: unknown[]) => mockQuery(sql, params),
  },
}));

vi.mock('../modeUpgradeAnalysisService.js', () => ({
  getRollingModeUpgradeAnalysis: (...args: unknown[]) => mockRollingAnalysis(...args),
}));

beforeEach(() => {
  mockQuery.mockReset();
  mockRollingAnalysis.mockReset();
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

describe('resolveNextGameModeCode', () => {
  it('maps mode progression to the next mode', () => {
    expect(resolveNextGameModeCode('LOW')).toBe('CHILL');
    expect(resolveNextGameModeCode('CHILL')).toBe('FLOW');
    expect(resolveNextGameModeCode('FLOW')).toBe('EVOLVE');
  });

  it('returns null for EVOLVE and unknown values', () => {
    expect(resolveNextGameModeCode('EVOLVE')).toBeNull();
    expect(resolveNextGameModeCode('UNKNOWN')).toBeNull();
  });
});

describe('gameModeUpgradeSuggestionService', () => {
  it('returns an eligible suggestion when rolling analysis is eligible', async () => {
    mockRollingAnalysis.mockResolvedValueOnce({
      has_analysis: true,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
    });

    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => {
          expect(params).toEqual(['CHILL']);
          return { rows: [{ game_mode_id: 12, code: 'CHILL' }] };
        },
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: (_sql, params) => {
          expect(params?.[1]).toBe('rolling_2025-01-31');
          return { rows: [{ accepted_at: null, dismissed_at: null }] };
        },
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result).toMatchObject({
      current_mode: 'LOW',
      suggested_mode: 'CHILL',
      period_key: 'rolling_2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
    });
  });

  it('keeps suggestion empty when rolling analysis has no analysis', async () => {
    mockRollingAnalysis.mockResolvedValueOnce({
      has_analysis: false,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: false,
      tasks_total_evaluated: 0,
      tasks_meeting_goal: 0,
      task_pass_rate: 0,
    });

    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 12, current_mode: 'CHILL' }] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');
    expect(result.eligible_for_upgrade).toBe(false);
    expect(result.suggested_mode).toBeNull();
    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'))).toBe(false);
  });

  it('returns no suggestion for EVOLVE mode', async () => {
    mockRollingAnalysis.mockResolvedValueOnce({
      has_analysis: true,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 9,
      tasks_meeting_goal: 9,
      task_pass_rate: 1,
    });

    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 14, current_mode: 'EVOLVE' }] }),
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: (_sql, params) => {
          expect(params?.[3]).toBe(null);
          return { rows: [{ accepted_at: null, dismissed_at: null }] };
        },
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');
    expect(result.suggested_mode).toBeNull();
  });

  it('accept updates user mode and records acceptance for current period', async () => {
    mockRollingAnalysis.mockResolvedValueOnce({
      has_analysis: true,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
    });

    queueExpectations([
      { match: (sql) => sql === 'BEGIN', handle: () => ({}) },
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }),
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_suggestions s'),
        handle: () => ({
          rows: [{ period_key: 'rolling_2025-01-31', eligible_for_upgrade: true, accepted_at: null, dismissed_at: null, current_mode: 'LOW', suggested_mode: 'CHILL' }],
        }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => ({ rows: [{ game_mode_id: params?.[0] === 'CHILL' ? 12 : 11, code: String(params?.[0]) }] }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => ({ rows: [{ game_mode_id: params?.[0] === 'CHILL' ? 12 : 11, code: String(params?.[0]) }] }),
      },
      {
        match: (sql) => sql.includes('UPDATE users'),
        handle: () => ({ rowCount: 1 }),
      },
      {
        match: (sql) => sql.includes('UPDATE user_game_mode_upgrade_suggestions'),
        handle: () => ({ rows: [{ accepted_at: '2026-03-11T00:00:00.000Z' }] }),
      },
      { match: (sql) => sql === 'COMMIT', handle: () => ({}) },
    ]);

    const result = await acceptGameModeUpgradeSuggestion('u1');
    expect(result.suggested_mode).toBe('CHILL');
    expect(result.accepted_at).toBe('2026-03-11T00:00:00.000Z');
  });

  it('dismiss is idempotent and keeps dismissed_at for the same period', async () => {
    mockRollingAnalysis.mockResolvedValue({
      has_analysis: true,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
    });

    queueExpectations([
      { match: (sql) => sql.includes('FROM users u'), handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }) },
      { match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null }] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 11, code: 'LOW' }] }) },
      { match: (sql) => sql.includes('UPDATE user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ dismissed_at: '2026-03-11T01:00:00.000Z' }] }) },
      { match: (sql) => sql.includes('FROM users u'), handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }) },
      { match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ accepted_at: null, dismissed_at: '2026-03-11T01:00:00.000Z' }] }) },
    ]);

    const dismissed = await dismissGameModeUpgradeSuggestion('u1');
    const fetchedAgain = await getGameModeUpgradeSuggestion('u1');

    expect(dismissed.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
    expect(fetchedAgain.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
  });
});
