import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken, mockGetTaskHabitAchievementState, mockApplyDecision, mockToggle } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockGetTaskHabitAchievementState: vi.fn(),
  mockApplyDecision: vi.fn(),
  mockToggle: vi.fn(),
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

vi.mock('../services/habitAchievementService.js', () => ({
  getTaskHabitAchievementState: mockGetTaskHabitAchievementState,
  applyHabitAchievementDecision: mockApplyDecision,
  toggleAchievedHabitTracking: mockToggle,
}));

import app from '../app.js';

const userId = '11111111-2222-3333-4444-555555555555';
const taskId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('task habit achievement routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockGetTaskHabitAchievementState.mockReset();
    mockApplyDecision.mockReset();
    mockToggle.mockReset();
    mockQuery.mockResolvedValue({ rows: [{ status: 'active' }], rowCount: 1 });
  });

  it('returns current task habit achievement state', async () => {
    mockVerifyToken.mockResolvedValue({ id: userId, clerkId: 'user_1', email: 'test@example.com', isNew: false });
    mockGetTaskHabitAchievementState.mockResolvedValue({
      task: { id: taskId, name: 'Read', lifecycle_status: 'achievement_maintained' },
      achievement: { exists: true, status: 'maintained', maintain_enabled: true },
    });

    const response = await request(app)
      .get(`/api/tasks/${taskId}/habit-achievement`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.achievement.status).toBe('maintained');
  });

  it('applies maintain/store decision', async () => {
    mockVerifyToken.mockResolvedValue({ id: userId, clerkId: 'user_1', email: 'test@example.com', isNew: false });
    mockGetTaskHabitAchievementState
      .mockResolvedValueOnce({ task: { id: taskId }, achievement: { status: 'pending_decision' } })
      .mockResolvedValueOnce({ task: { id: taskId }, achievement: { status: 'stored', maintain_enabled: false } });

    const response = await request(app)
      .post(`/api/tasks/${taskId}/habit-achievement/decision`)
      .set('Authorization', 'Bearer token')
      .send({ decision: 'store' });

    expect(response.status).toBe(200);
    expect(mockApplyDecision).toHaveBeenCalledWith({
      taskId,
      userId,
      decision: 'store',
    });
    expect(response.body.achievement.status).toBe('stored');
  });

  it('toggles maintained from shelf', async () => {
    mockVerifyToken.mockResolvedValue({ id: userId, clerkId: 'user_1', email: 'test@example.com', isNew: false });
    mockGetTaskHabitAchievementState
      .mockResolvedValueOnce({ task: { id: taskId }, achievement: { status: 'stored', maintain_enabled: false } })
      .mockResolvedValueOnce({ task: { id: taskId }, achievement: { status: 'maintained', maintain_enabled: true } });

    const response = await request(app)
      .post(`/api/tasks/${taskId}/habit-achievement/toggle-maintained`)
      .set('Authorization', 'Bearer token')
      .send({ maintainEnabled: true });

    expect(response.status).toBe(200);
    expect(mockToggle).toHaveBeenCalledWith({
      taskId,
      userId,
      maintainEnabled: true,
    });
    expect(response.body.achievement.status).toBe('maintained');
  });
});
