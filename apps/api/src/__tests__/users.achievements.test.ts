import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

import app from '../app.js';
import { computeThresholdsFromBaseXp } from '../controllers/users/level-thresholds.js';
import { buildLevelSummary } from '../controllers/users/level-summary.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('GET /api/users/:id/achievements', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(app).get(`/api/users/${userId}/achievements`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('returns derived achievements for the user', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-08T12:00:00.000Z'));

    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

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

    const response = await request(app)
      .get(`/api/users/${userId}/achievements`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: userId,
      achievements: [
        {
          id: 'ach_streak_7',
          name: '7-Day Flame',
          earned_at: null,
          progress: { current: 8, target: 7, pct: 100 },
        },
        {
          id: 'ach_level_5',
          name: 'Level 5',
          earned_at: null,
          progress: { current: 6, target: 5, pct: 100 },
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
      `SELECT date, xp_day\n       FROM v_user_daily_xp\n       WHERE user_id = $1\n       ORDER BY date DESC\n       LIMIT 60`,
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      `SELECT COALESCE(total_xp, 0) AS total_xp\n       FROM v_user_total_xp\n       WHERE user_id = $1`,
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      `SELECT level, xp_required\n       FROM v_user_level\n       WHERE user_id = $1\n       ORDER BY level ASC`,
      [userId],
    );
  });

  it('returns 404 when the user is missing', async () => {
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await request(app)
      .get(`/api/users/${userId}/achievements`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      code: 'user_not_found',
      message: 'User not found',
    });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when requesting a different user', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'another-user-id',
      clerkId: 'user_999',
      email: 'hacker@example.com',
      isNew: false,
    });

    const response = await request(app)
      .get(`/api/users/${userId}/achievements`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      code: 'forbidden',
      message: 'You do not have access to this resource',
    });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockVerifyToken).toHaveBeenCalledTimes(1);
  });

  it('derives level thresholds from tasks when the view is empty', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-08T12:00:00.000Z'));

    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: userId }] })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-08', xp_day: '120' }] })
      .mockResolvedValueOnce({ rows: [{ total_xp: '147' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ xp_base_sum: '42' }] });

    const fallbackThresholds = computeThresholdsFromBaseXp('42');
    const levelSummary = buildLevelSummary(147, fallbackThresholds);

    const expectedAchievements = [
      {
        id: 'ach_streak_7',
        name: '7-Day Flame',
        earned_at: null,
        progress: { current: 1, target: 7, pct: 14.3 },
      },
      {
        id: 'ach_level_5',
        name: 'Level 5',
        earned_at: null,
        progress: {
          current: levelSummary.currentLevel,
          target: 5,
          pct: Math.round(Math.min(100, (levelSummary.currentLevel / 5) * 100) * 10) / 10,
        },
      },
    ];

    const response = await request(app)
      .get(`/api/users/${userId}/achievements`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user_id: userId,
      achievements: expectedAchievements,
    });

    expect(mockQuery).toHaveBeenCalledTimes(5);
    expect(mockQuery).toHaveBeenNthCalledWith(
      5,
      `SELECT COALESCE(SUM(CASE WHEN active THEN xp_base ELSE 0 END), 0) AS xp_base_sum\n       FROM tasks\n       WHERE user_id = $1`,
      [userId],
    );
  });
});
