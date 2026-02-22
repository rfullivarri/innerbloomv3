import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockEnsureUserExists, mockVerifyToken } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
  dbReady: Promise.resolve(),
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('../../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));
vi.mock('../../middlewares/require-active-subscription.js', () => ({
  requireActiveSubscription: (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
}));

import app from '../../app.js';

const userId = '11111111-2222-3333-4444-555555555555';
const taskId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('DELETE /api/users/:id/tasks/:taskId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    mockVerifyToken.mockReset();
  });

  it('deletes a task that belongs to the authenticated user', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ column_name: 'archived_at' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ task_id: taskId }] });

    const response = await request(app)
      .delete(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(mockEnsureUserExists).toHaveBeenCalledWith(userId);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('information_schema.columns'),
      ['tasks', ['stat_id', 'completed_at', 'archived_at']],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE tasks'),
      [taskId, userId],
    );
  });

  it('returns 404 when the task is not found', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ column_name: 'archived_at' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .delete(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ code: 'task_not_found', message: 'Task not found' });
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('information_schema.columns'),
      ['tasks', ['stat_id', 'completed_at', 'archived_at']],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE tasks'),
      [taskId, userId],
    );
  });
});
