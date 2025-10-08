import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('GET /api/users/:id/achievements', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns derived achievements for the user', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-08T12:00:00.000Z'));

    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({
        rows: [
          { date: '2024-03-01', xp_day: '50' },
          { date: '2024-03-02', xp_day: '60' },
          { date: '2024-03-03', xp_day: '70' },
          { date: '2024-03-04', xp_day: '80' },
          { date: '2024-03-05', xp_day: '90' },
          { date: '2024-03-06', xp_day: '100' },
          { date: '2024-03-07', xp_day: '110' },
          { date: '2024-03-08', xp_day: '120' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total_xp: '680' }] })
      .mockResolvedValueOnce({
        rows: [
          { level: 0, xp_required: 0 },
          { level: 1, xp_required: 50 },
          { level: 2, xp_required: 150 },
          { level: 3, xp_required: 250 },
          { level: 4, xp_required: 350 },
          { level: 5, xp_required: 500 },
          { level: 6, xp_required: 650 },
        ],
      });

    const response = await request(app).get(`/api/users/${userId}/achievements`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: userId,
      achievements: [
        {
          id: 'ach_streak_7',
          name: '7-Day Flame',
          earned_at: '2024-03-07T00:00:00.000Z',
          progress: { current: 8, target: 7, pct: 1 },
        },
        {
          id: 'ach_level_5',
          name: 'Level 5',
          earned_at: '2024-03-07T00:00:00.000Z',
          progress: { current: 6, target: 5, pct: 1 },
        },
      ],
    });

    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'SELECT user_id FROM users WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      `SELECT date, xp_day\n     FROM v_user_daily_xp\n     WHERE user_id = $1\n     ORDER BY date ASC`,
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      `SELECT COALESCE(total_xp, 0) AS total_xp\n     FROM v_user_total_xp\n     WHERE user_id = $1`,
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      `SELECT level, xp_required\n     FROM v_user_level\n     WHERE user_id = $1\n     ORDER BY level ASC`,
      [userId],
    );
  });

  it('returns 404 when the user is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await request(app).get(`/api/users/${userId}/achievements`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'user_not_found',
      message: 'User not found',
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
