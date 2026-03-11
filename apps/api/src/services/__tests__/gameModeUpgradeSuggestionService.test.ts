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
  it('returns an eligible suggestion when pass-rate aggregate is eligible', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 10,
              tasks_meeting_goal: 8,
              task_pass_rate: 0.8,
              eligible_for_upgrade: true,
            },
          ],
        }),
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
        handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null }] }),
      },
    ]);

    const result = await getGameModeUpgradeSuggestion('u1');

    expect(result).toMatchObject({
      current_mode: 'LOW',
      suggested_mode: 'CHILL',
      period_key: '2026-02',
      eligible_for_upgrade: true,
      tasks_total_evaluated: 10,
      tasks_meeting_goal: 8,
      task_pass_rate: 0.8,
      accepted_at: null,
      dismissed_at: null,
    });
  });

  it('keeps suggestion empty when aggregate is not eligible', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 12, current_mode: 'CHILL' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 10,
              tasks_meeting_goal: 5,
              task_pass_rate: 0.5,
              eligible_for_upgrade: false,
            },
          ],
        }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: () => ({ rows: [{ game_mode_id: 13, code: 'FLOW' }] }),
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
    expect(result.eligible_for_upgrade).toBe(false);
    expect(result.suggested_mode).toBeNull();
  });

  it('returns no suggestion for EVOLVE mode', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 14, current_mode: 'EVOLVE' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 9,
              tasks_meeting_goal: 9,
              task_pass_rate: 1,
              eligible_for_upgrade: true,
            },
          ],
        }),
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
    queueExpectations([
      { match: (sql) => sql === 'BEGIN', handle: () => ({}) },
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 10,
              tasks_meeting_goal: 8,
              task_pass_rate: 0.8,
              eligible_for_upgrade: true,
            },
          ],
        }),
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
        handle: () => ({ rows: [{ accepted_at: null, dismissed_at: null }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_game_mode_upgrade_suggestions s'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              eligible_for_upgrade: true,
              accepted_at: null,
              dismissed_at: null,
              current_mode: 'LOW',
              suggested_mode: 'CHILL',
            },
          ],
        }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => {
          expect(params).toEqual(['CHILL']);
          return { rows: [{ game_mode_id: 12, code: 'CHILL' }] };
        },
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: (_sql, params) => {
          expect(params).toEqual(['LOW']);
          return { rows: [{ game_mode_id: 11, code: 'LOW' }] };
        },
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

    expect(mockQuery.mock.calls.some(([sql]) => sql.includes('UPDATE users'))).toBe(true);
  });

  it('dismiss is idempotent and keeps dismissed_at for the same period', async () => {
    queueExpectations([
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 10,
              tasks_meeting_goal: 8,
              task_pass_rate: 0.8,
              eligible_for_upgrade: true,
            },
          ],
        }),
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
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: () => ({ rows: [{ game_mode_id: 11, code: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('UPDATE user_game_mode_upgrade_suggestions'),
        handle: () => ({ rows: [{ dismissed_at: '2026-03-11T01:00:00.000Z' }] }),
      },
      {
        match: (sql) => sql.includes('FROM users u'),
        handle: () => ({ rows: [{ user_id: 'u1', game_mode_id: 11, current_mode: 'LOW' }] }),
      },
      {
        match: (sql) => sql.includes('FROM user_monthly_mode_upgrade_stats'),
        handle: () => ({
          rows: [
            {
              period_key: '2026-02',
              tasks_total_evaluated: 10,
              tasks_meeting_goal: 8,
              task_pass_rate: 0.8,
              eligible_for_upgrade: true,
            },
          ],
        }),
      },
      {
        match: (sql) => sql.includes('FROM cat_game_mode') && sql.includes('WHERE code = $1'),
        handle: () => ({ rows: [{ game_mode_id: 12, code: 'CHILL' }] }),
      },
      {
        match: (sql) => sql.includes('INSERT INTO user_game_mode_upgrade_suggestions'),
        handle: () => ({ rows: [{ accepted_at: null, dismissed_at: '2026-03-11T01:00:00.000Z' }] }),
      },
    ]);

    const dismissed = await dismissGameModeUpgradeSuggestion('u1');
    const fetchedAgain = await getGameModeUpgradeSuggestion('u1');

    expect(dismissed.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
    expect(fetchedAgain.dismissed_at).toBe('2026-03-11T01:00:00.000Z');
  });
});
