import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
  withClient: vi.fn(),
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

vi.mock('../middlewares/require-active-subscription.js', () => ({
  requireActiveSubscription: (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
}));

import app from '../app.js';

describe('moderation routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });
  });

  it('returns moderation state for users without previous configuration', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ day_key: '2026-03-01' }] })
      .mockResolvedValueOnce({
        rows: [
          { type: 'alcohol', is_enabled: false, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
          { type: 'sugar', is_enabled: false, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
          { type: 'tobacco', is_enabled: false, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ submitted: false }] });

    const response = await request(app)
      .get('/api/moderation')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dayKey: '2026-03-01',
      dailyQuestCompleted: false,
      trackers: [
        {
          type: 'alcohol',
          is_enabled: false,
          is_paused: false,
          not_logged_tolerance_days: 2,
          current_streak_days: 0,
          statusToday: 'not_logged',
        },
        {
          type: 'sugar',
          is_enabled: false,
          is_paused: false,
          not_logged_tolerance_days: 2,
          current_streak_days: 0,
          statusToday: 'not_logged',
        },
        {
          type: 'tobacco',
          is_enabled: false,
          is_paused: false,
          not_logged_tolerance_days: 2,
          current_streak_days: 0,
          statusToday: 'not_logged',
        },
      ],
    });

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO moderation_trackers'), ['user-1']);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users'), ['user-1']);
  });

  it('allows enabling a moderation tracker directly via config endpoint', async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ is_paused: false, not_logged_tolerance_days: 2 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ day_key: '2026-03-01' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rows: [{ day_key: '2026-03-01' }] })
      .mockResolvedValueOnce({
        rows: [
          { type: 'alcohol', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
          { type: 'sugar', is_enabled: false, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
          { type: 'tobacco', is_enabled: false, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ submitted: false }] });

    const response = await request(app)
      .put('/api/moderation/alcohol/config')
      .set('Authorization', 'Bearer token')
      .send({ isEnabled: true });

    expect(response.status).toBe(200);
    expect(response.body.trackers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'alcohol', is_enabled: true }),
      ]),
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE moderation_trackers'),
      ['user-1', 'alcohol', true, null, null],
    );
  });
});
