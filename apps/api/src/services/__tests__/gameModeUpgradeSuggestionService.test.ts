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
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [] }),
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
      {
        match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result).toMatchObject({
      debug_forced_cta: false,
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
      {
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');
    expect(result.debug_forced_cta).toBe(false);
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
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [] }),
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: (_sql, params) => {
          expect(params?.[3]).toBe(null);
          return { rows: [{ accepted_at: null, dismissed_at: null }] };
        },
      },
      {
        match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');
    expect(result.suggested_mode).toBeNull();
  });


  it('returns forced CTA when debug override is active', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [{ user_id: 'u1', enabled: true, forced_current_mode: 'CHILL', forced_next_mode: 'FLOW', expires_at: null, created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' }] }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => {
          expect(params).toEqual(['FLOW']);
          return { rows: [{ game_mode_id: 13, code: 'FLOW' }] };
        },
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: (_sql, params) => {
          expect(params?.[1]).toBe('debug_forced');
          return { rows: [{ accepted_at: null, dismissed_at: null, created_at: null }] };
        },
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result).toMatchObject({
      debug_forced_cta: true,
      current_mode: 'CHILL',
      suggested_mode: 'FLOW',
      period_key: 'debug_forced',
      eligible_for_upgrade: true,
      cta_enabled: true,
    });
    expect(mockRollingAnalysis).not.toHaveBeenCalled();
  });

  it('resets accepted_at and dismissed_at when debug forced CTA is reapplied', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [{ user_id: 'u1', enabled: true, forced_current_mode: 'CHILL', forced_next_mode: 'FLOW', expires_at: null, created_at: '2026-03-13T00:00:00.000Z', updated_at: '2026-03-13T00:00:00.000Z' }] }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => {
          expect(params).toEqual(['FLOW']);
          return { rows: [{ game_mode_id: 13, code: 'FLOW' }] };
        },
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: (sql, params) => {
          expect(params?.[1]).toBe('debug_forced');
          expect(sql).toContain("WHEN EXCLUDED.period_key = 'debug_forced' THEN NULL");
          return { rows: [{ accepted_at: null, dismissed_at: null, created_at: null }] };
        },
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result.debug_forced_cta).toBe(true);
    expect(result.period_key).toBe('debug_forced');
    expect(result.accepted_at).toBeNull();
    expect(result.dismissed_at).toBeNull();
    expect(result.cta_enabled).toBe(true);
  });


  it('falls back to rolling eligibility when debug override is absent', async () => {
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
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [] }),
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
        match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'),
        handle: () => ({ rows: [] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result.debug_forced_cta).toBe(false);
    expect(result.period_key).toBe('rolling_2025-01-31');
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
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'),
        handle: () => ({ rows: [] }),
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
        match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'),
        handle: () => ({ rows: [] }),
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
        handle: (_sql, params) => {
          expect(params).toEqual(['u1', 12, 11]);
          return { rows: [{ user_id: 'u1', game_mode_id: 12, image_url: '/Chill-Mood.jpg', avatar_url: '/Chill-Mood.jpg' }] };
        },
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


  it('keeps accepted_at visible for a period after real upgrade changed current mode', async () => {
    mockRollingAnalysis.mockResolvedValueOnce({
      has_analysis: true,
      analysis_end: '2025-01-31',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
    });

    queueExpectations([
      { match: (sql) => sql.includes('FROM users u'), handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 12, current_mode: 'CHILL' }] }) },
      { match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'), handle: () => ({ rows: [] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 13, code: 'FLOW' }] }) },
      { match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null, created_at: '2026-03-13T00:00:00.000Z' }] }) },
      {
        match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'),
        handle: (_sql, params) => {
          expect(params).toEqual(['u1', 'rolling_2025-01-31']);
          return { rows: [{ accepted_at: '2026-03-11T00:00:00.000Z' }] };
        },
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');
    expect(result.accepted_at).toBe('2026-03-11T00:00:00.000Z');
    expect(result.cta_enabled).toBe(false);
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
      { match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'), handle: () => ({ rows: [] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }) },
      { match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null }] }) },
      { match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'), handle: () => ({ rows: [] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 11, code: 'LOW' }] }) },
      { match: (sql) => sql.includes('UPDATE user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ dismissed_at: '2026-03-11T01:00:00.000Z' }] }) },
      { match: (sql) => sql.includes('FROM users u'), handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }) },
      { match: (sql) => sql.includes('FROM user_game_mode_upgrade_cta_overrides') && sql.includes('enabled = TRUE'), handle: () => ({ rows: [] }) },
      { match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'), handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }) },
      { match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'), handle: () => ({ rows: [{ accepted_at: null, dismissed_at: '2026-03-11T01:00:00.000Z' }] }) },
      { match: (sql) => sql.includes('SELECT accepted_at') && sql.includes('accepted_at IS NOT NULL'), handle: () => ({ rows: [] }) },
    ]);

    const dismissed = await dismissGameModeUpgradeSuggestion('u1');
    const fetchedAgain = await getGameModeUpgradeSuggestion('u1');

    expect(dismissed.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
    expect(fetchedAgain.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
  });
});
