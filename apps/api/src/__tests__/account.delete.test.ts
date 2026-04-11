import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken, mockDeleteAccount } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockDeleteAccount: vi.fn(),
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

vi.mock('../services/account-deletion-service.js', () => ({
  getAccountDeletionService: () => ({
    deleteAccount: mockDeleteAccount,
  }),
}));

import app from '../app.js';

describe('DELETE /api/account', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockDeleteAccount.mockReset();
  });

  it('requires authentication', async () => {
    const response = await request(app).delete('/api/account');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the authenticated account', async () => {
    mockVerifyToken.mockResolvedValue({
      id: '8f15868c-62ac-4749-bbf9-68bfb0f6f93f',
      clerkId: 'user_clerk_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockDeleteAccount.mockResolvedValue({
      deleted: {
        feedbackEvents: 1,
        feedbackNotificationStates: 1,
        weeklyWrapped: 1,
        dailyLog: 2,
        emotionLogs: 3,
        tasks: 4,
        users: 1,
      },
    });

    const response = await request(app)
      .delete('/api/account')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      deleted: {
        feedbackEvents: 1,
        feedbackNotificationStates: 1,
        weeklyWrapped: 1,
        dailyLog: 2,
        emotionLogs: 3,
        tasks: 4,
        users: 1,
      },
    });
    expect(mockDeleteAccount).toHaveBeenCalledWith({
      userId: '8f15868c-62ac-4749-bbf9-68bfb0f6f93f',
      clerkUserId: 'user_clerk_123',
    });
  });
});
