import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken, mockGetRewardsHistoryMonthlyWrapups } =
  vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockVerifyToken: vi.fn(),
    mockGetRewardsHistoryMonthlyWrapups: vi.fn(),
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

vi.mock('../services/monthlyWrappedService.js', () => ({
  getRewardsHistoryMonthlyWrapups: mockGetRewardsHistoryMonthlyWrapups,
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('GET /api/users/:id/rewards/history', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetRewardsHistoryMonthlyWrapups.mockReset();
  });

  it('returns 401 when authentication is missing', async () => {
    const response = await request(app).get(`/api/users/${userId}/rewards/history`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
  });

  it('returns monthly wrap-up history', async () => {
    mockVerifyToken.mockResolvedValue({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    mockQuery.mockResolvedValue({ rows: [{ user_id: userId }], rowCount: 1 });
    mockGetRewardsHistoryMonthlyWrapups.mockResolvedValue([
      {
        id: 'monthly-1',
        userId,
        periodKey: '2026-02',
        payload: {
          period_key: '2026-02',
          current_mode: 'FLOW',
          mode_weekly_target: 3,
          tasks_total_evaluated: 10,
          tasks_meeting_goal: 7,
          task_pass_rate: 0.7,
          eligible_for_upgrade: false,
          suggested_next_mode: null,
          monthly_kpis: {
            tasksCompleted: 24,
            xpGained: 1200,
            dominantPillar: 'MIND',
            dominantPillarTasksCompleted: 13,
          },
          slide_2: {
            title: 'you_were_close',
            message: 'You were close',
            missingTasksToUpgrade: 1,
          },
        },
        summary: null,
        createdAt: '2026-03-01T12:00:00.000Z',
        updatedAt: '2026-03-01T12:00:00.000Z',
      },
    ]);

    const response = await request(app)
      .get(`/api/users/${userId}/rewards/history`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.monthly_wrapups).toHaveLength(1);
    expect(response.body.monthly_wrapups[0].periodKey).toBe('2026-02');
    expect(mockGetRewardsHistoryMonthlyWrapups).toHaveBeenCalledWith(userId);
  });
});
