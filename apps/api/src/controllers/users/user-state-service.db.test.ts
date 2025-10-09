import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

let getUserProfile: typeof import('./user-state-service.js')['getUserProfile'];
let getXpBaseByPillar: typeof import('./user-state-service.js')['getXpBaseByPillar'];
let getDailyXpSeriesByPillar: typeof import('./user-state-service.js')['getDailyXpSeriesByPillar'];
let getUserLogStats: typeof import('./user-state-service.js')['getUserLogStats'];

describe('user-state-service database helpers', () => {
  beforeEach(async () => {
    mockQuery.mockReset();
    ({
      getUserProfile,
      getXpBaseByPillar,
      getDailyXpSeriesByPillar,
      getUserLogStats,
    } = await import('./user-state-service.js'));
  });

  it('loads the user profile with mode fallback', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          user_id: 'user-123',
          mode_code: 'flow',
          mode_name: 'Flow Mode',
          weekly_target: '900',
          timezone: 'America/New_York',
        },
      ],
    });

    const profile = await getUserProfile('user-123');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users u'), ['user-123']);
    expect(profile).toEqual({
      userId: 'user-123',
      modeCode: 'FLOW',
      modeName: 'Flow Mode',
      weeklyTarget: 900,
      timezone: 'America/New_York',
    });
  });

  it('throws when the user profile is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(getUserProfile('missing')).rejects.toBeInstanceOf(HttpError);
  });

  it('aggregates XP base by pillar, skipping unknown ids', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { pillar_id: 1, xp_base: '15' },
        { pillar_id: 2, xp_base: 20 },
        { pillar_id: 999, xp_base: 5 },
      ],
    });

    const xpBase = await getXpBaseByPillar('user-999');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM tasks t'), ['user-999']);
    expect(xpBase).toEqual({ Body: 15, Mind: 20, Soul: 0 });
  });

  it('builds a map of daily XP per pillar', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { date: '2024-05-01', pillar_id: 1, xp_day: '10' },
        { date: '2024-05-01', pillar_id: 2, xp_day: '5' },
        { date: '2024-05-02', pillar_id: 3, xp_day: '2' },
        { date: '2024-05-02', pillar_id: 999, xp_day: '100' },
      ],
    });

    const series = await getDailyXpSeriesByPillar('user-abc', '2024-05-01', '2024-05-02');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM daily_log dl'),
      ['user-abc', '2024-05-01', '2024-05-02'],
    );
    expect(series).toEqual(
      new Map([
        ['2024-05-01', { Body: 10, Mind: 5 }],
        ['2024-05-02', { Soul: 2 }],
      ]),
    );
  });

  it('returns log stats with defaults when no rows exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const stats = await getUserLogStats('user-logs');

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM daily_log'), ['user-logs']);
    expect(stats).toEqual({ uniqueDays: 0, firstDate: null });
  });
});
