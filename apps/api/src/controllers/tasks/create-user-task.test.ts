import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockEnsureUserExists, mockVerifyToken, mockRandomUUID } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockRandomUUID: vi.fn(),
}));

vi.mock('node:crypto', async () => ({
  ...(await vi.importActual<typeof import('node:crypto')>('node:crypto')),
  randomUUID: mockRandomUUID,
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

describe('POST /api/users/:id/tasks', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    mockVerifyToken.mockReset();
    mockRandomUUID.mockReset();
  });

  it('creates a user task and returns the persisted row', async () => {
    const taskId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockRandomUUID.mockReturnValueOnce(taskId);
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tasks_group_id: 'group-1' }] })
      .mockResolvedValueOnce({ rows: [{ xp_base: 15 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            user_id: userId,
            tasks_group_id: 'group-1',
            task: 'Read a book',
            pillar_id: 2,
            trait_id: 5,
            stat_id: 7,
            difficulty_id: 3,
            xp_base: 15,
            notes: 'Evening reading',
            active: true,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
            completed_at: null,
            archived_at: null,
          },
        ],
      });

    const response = await request(app)
      .post(`/api/users/${userId}/tasks`)
      .set('Authorization', 'Bearer token')
      .send({
        title: 'Read a book',
        pillar_id: 2,
        trait_id: 5,
        stat_id: 7,
        difficulty_id: 3,
        notes: 'Evening reading',
        is_active: true,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      task: {
        task_id: taskId,
        user_id: userId,
        tasks_group_id: 'group-1',
        task: 'Read a book',
        pillar_id: 2,
        trait_id: 5,
        stat_id: 7,
        difficulty_id: 3,
        xp_base: 15,
        notes: 'Evening reading',
        active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        completed_at: null,
        archived_at: null,
      },
    });

    expect(mockEnsureUserExists).toHaveBeenCalledWith(userId);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      'SELECT tasks_group_id FROM users WHERE user_id = $1 LIMIT 1',
      [userId],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      'SELECT xp_base FROM cat_difficulty WHERE difficulty_id = $1 LIMIT 1',
      [3],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO tasks'),
      [
        taskId,
        userId,
        'group-1',
        'Read a book',
        2,
        5,
        7,
        3,
        15,
        'Evening reading',
        true,
      ],
    );
  });

  it('returns 400 when the title is missing', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    const response = await request(app)
      .post(`/api/users/${userId}/tasks`)
      .set('Authorization', 'Bearer token')
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
    expect(response.body.message).toBe('title is required');
    expect(mockEnsureUserExists).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
