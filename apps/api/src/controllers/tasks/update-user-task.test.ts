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

import app from '../../app.js';

const userId = '11111111-2222-3333-4444-555555555555';
const taskId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('PATCH /api/users/:id/tasks/:taskId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    mockVerifyToken.mockReset();
  });

  it('updates a task for the authenticated user', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);

    const existingRow = {
      task_id: taskId,
      user_id: userId,
      tasks_group_id: 'group-1',
      task: 'Old title',
      pillar_id: 1,
      trait_id: 2,
      stat_id: 3,
      difficulty_id: 1,
      xp_base: 10,
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      completed_at: null,
      archived_at: null,
    };

    const updatedRow = {
      ...existingRow,
      task: 'Read more books',
      difficulty_id: 4,
      xp_base: 30,
      active: false,
      updated_at: '2024-01-02T00:00:00.000Z',
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'stat_id' },
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [existingRow] })
      .mockResolvedValueOnce({ rows: [{ xp_base: 30 }] })
      .mockResolvedValueOnce({ rows: [updatedRow] });

    const response = await request(app)
      .patch(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token')
      .send({
        title: ' Read more books ',
        difficulty_id: 4,
        is_active: false,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      task: {
        ...updatedRow,
        stat_id: updatedRow.stat_id,
        completed_at: null,
        archived_at: null,
      },
    });

    expect(mockEnsureUserExists).toHaveBeenCalledWith(userId);
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('information_schema.columns'),
      [
        'tasks',
        ['stat_id', 'completed_at', 'archived_at'],
      ],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT task_id'),
      [taskId, userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      'SELECT xp_base FROM cat_difficulty WHERE difficulty_id = $1 LIMIT 1',
      [4],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE tasks'),
      ['Read more books', 4, 30, false, taskId, userId],
    );
  });

  it('rejects an empty title', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_456',
      email: 'test@example.com',
      isNew: false,
    });

    const response = await request(app)
      .patch(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token')
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(mockEnsureUserExists).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('sets xp_base to 0 when the difficulty is not found', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_789',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);

    const existingRow = {
      task_id: taskId,
      user_id: userId,
      tasks_group_id: 'group-2',
      task: 'Practice piano',
      pillar_id: 2,
      trait_id: 3,
      stat_id: 4,
      difficulty_id: 2,
      xp_base: 15,
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      completed_at: null,
      archived_at: null,
    };

    const updatedRow = {
      ...existingRow,
      difficulty_id: 9,
      xp_base: 0,
      updated_at: '2024-01-03T00:00:00.000Z',
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'stat_id' },
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [existingRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [updatedRow] });

    const response = await request(app)
      .patch(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token')
      .send({ difficulty_id: 9 });

    expect(response.status).toBe(200);
    expect(response.body.task.xp_base).toBe(0);
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE tasks'),
      [9, 0, taskId, userId],
    );
  });

  it('allows toggling the active flag', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_999',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);

    const existingRow = {
      task_id: taskId,
      user_id: userId,
      tasks_group_id: 'group-3',
      task: 'Meditate',
      pillar_id: 3,
      trait_id: 4,
      stat_id: 5,
      difficulty_id: null,
      xp_base: 0,
      active: true,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      completed_at: null,
      archived_at: null,
    };

    const updatedRow = {
      ...existingRow,
      active: false,
      updated_at: '2024-01-04T00:00:00.000Z',
    };

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'stat_id' },
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
      .mockResolvedValueOnce({ rows: [existingRow] })
      .mockResolvedValueOnce({ rows: [updatedRow] });

    const response = await request(app)
      .patch(`/api/users/${userId}/tasks/${taskId}`)
      .set('Authorization', 'Bearer token')
      .send({ is_active: false });

    expect(response.status).toBe(200);
    expect(response.body.task.active).toBe(false);
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('UPDATE tasks'),
      [false, taskId, userId],
    );
  });
});
