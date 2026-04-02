import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockQuery,
  mockVerifyToken,
  mockGetRecentWeeklyWrapped,
  mockGetRewardsHistoryMonthlyWrapups,
  mockGetUserRewardsHabitAchievementsByPillar,
  mockGetUserPendingHabitAchievementCount,
  mockCountUnseenWeeklyWrapped,
  mockListSeenWeeklyWrappedIds,
} =
  vi.hoisted(() => ({
    mockQuery: vi.fn(),
    mockVerifyToken: vi.fn(),
    mockGetRecentWeeklyWrapped: vi.fn(),
    mockGetRewardsHistoryMonthlyWrapups: vi.fn(),
    mockGetUserRewardsHabitAchievementsByPillar: vi.fn(),
    mockGetUserPendingHabitAchievementCount: vi.fn(),
    mockCountUnseenWeeklyWrapped: vi.fn(),
    mockListSeenWeeklyWrappedIds: vi.fn(),
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

vi.mock('../services/weeklyWrappedService.js', () => ({
  getRecentWeeklyWrapped: mockGetRecentWeeklyWrapped,
}));

vi.mock('../services/habitAchievementService.js', () => ({
  getUserRewardsHabitAchievementsByPillar: mockGetUserRewardsHabitAchievementsByPillar,
  getUserPendingHabitAchievementCount: mockGetUserPendingHabitAchievementCount,
}));

vi.mock('../services/weeklyWrappedViewsService.js', () => ({
  countUnseenWeeklyWrapped: mockCountUnseenWeeklyWrapped,
  listSeenWeeklyWrappedIds: mockListSeenWeeklyWrappedIds,
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('GET /api/users/:id/rewards/history', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetRecentWeeklyWrapped.mockReset();
    mockGetRewardsHistoryMonthlyWrapups.mockReset();
    mockGetUserRewardsHabitAchievementsByPillar.mockReset();
    mockGetUserPendingHabitAchievementCount.mockReset();
    mockCountUnseenWeeklyWrapped.mockReset();
    mockListSeenWeeklyWrappedIds.mockReset();
    mockCountUnseenWeeklyWrapped.mockResolvedValue(0);
    mockListSeenWeeklyWrappedIds.mockResolvedValue(new Set());
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
    mockGetRecentWeeklyWrapped.mockResolvedValue([
      {
        id: 'weekly-1',
        userId,
        weekStart: '2026-03-16',
        weekEnd: '2026-03-22',
        payload: { summary: { dominantPillar: 'Mind' } },
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
      },
    ]);
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
    mockGetUserRewardsHabitAchievementsByPillar.mockResolvedValue([
      {
        pillar: { id: 1, code: 'MIND', name: 'Mind' },
        habits: [
          {
            id: 'habit-1',
            task_id: 'task-1',
            task_name: 'Meditate 10 min',
            status: 'maintained',
            achieved_at: '2026-03-01T00:00:00.000Z',
            decision_made_at: '2026-03-02T00:00:00.000Z',
            gp_before_achievement: 44,
            gp_since_maintain: 7,
            maintain_enabled: true,
            pillar: { id: 1, code: 'MIND', name: 'Mind' },
            trait: { id: 9, code: 'focus', name: 'Focus' },
            seal: { visible: true },
          },
        ],
      },
    ]);
    mockGetUserPendingHabitAchievementCount.mockResolvedValue(2);
    mockCountUnseenWeeklyWrapped.mockResolvedValue(1);
    mockListSeenWeeklyWrappedIds.mockResolvedValue(new Set(['weekly-1']));

    const response = await request(app)
      .get(`/api/users/${userId}/rewards/history`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.weekly_wrapups).toHaveLength(1);
    expect(response.body.weekly_wrapups[0].id).toBe('weekly-1');
    expect(response.body.weekly_wrapups[0].seen).toBe(true);
    expect(response.body.weekly_unseen_count).toBe(1);
    expect(response.body.monthly_wrapups).toHaveLength(1);
    expect(response.body.monthly_wrapups[0].periodKey).toBe('2026-02');
    expect(response.body.habit_achievements).toEqual({
      pending_count: 2,
      achieved_by_pillar: expect.any(Array),
    });
    expect(mockGetRecentWeeklyWrapped).toHaveBeenCalledWith(userId, 4);
    expect(mockGetRewardsHistoryMonthlyWrapups).toHaveBeenCalledWith(userId);
    expect(mockGetUserRewardsHabitAchievementsByPillar).toHaveBeenCalledWith(userId);
    expect(mockGetUserPendingHabitAchievementCount).toHaveBeenCalledWith(userId);
  });
});
