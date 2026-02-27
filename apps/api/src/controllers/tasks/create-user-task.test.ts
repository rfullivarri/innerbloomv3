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
          { column_name: 'stat_id' },
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
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
        active: true,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        completed_at: null,
        archived_at: null,
      },
    });

    expect(mockEnsureUserExists).toHaveBeenCalledWith(userId);
    expect(mockQuery).toHaveBeenCalledTimes(5);
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
      expect.stringContaining('information_schema.columns'),
      [
        'tasks',
        ['stat_id', 'completed_at', 'archived_at'],
      ],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
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
        true,
      ],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('UPDATE users'),
      [userId],
    );
  });

  it('defaults stat_id to trait_id when none is provided', async () => {
    const taskId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
    mockRandomUUID.mockReturnValueOnce(taskId);
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_456',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tasks_group_id: 'group-2' }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'stat_id' },
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            user_id: userId,
            tasks_group_id: 'group-2',
            task: 'Write reflection',
            pillar_id: 3,
            trait_id: 8,
            stat_id: 8,
            difficulty_id: null,
            xp_base: 0,
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
        title: 'Write reflection',
        pillar_id: 3,
        trait_id: 8,
        is_active: true,
      });

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledTimes(4);

    const insertCall = mockQuery.mock.calls[2];
    expect(insertCall?.[0]).toContain('INSERT INTO tasks');
    expect(insertCall?.[1]).toEqual([
      taskId,
      userId,
      'group-2',
      'Write reflection',
      3,
      8,
      8,
      null,
      0,
      true,
    ]);

    expect(response.body.task).toMatchObject({
      stat_id: 8,
    });
  });

  it('omits stat_id from the insert when the column is missing', async () => {
    const taskId = 'cccccccc-dddd-eeee-ffff-000000000000';
    mockRandomUUID.mockReturnValueOnce(taskId);
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_789',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tasks_group_id: 'group-3' }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'completed_at' },
          { column_name: 'archived_at' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            user_id: userId,
            tasks_group_id: 'group-3',
            task: 'Practice breathing',
            pillar_id: 4,
            trait_id: 9,
            difficulty_id: null,
            xp_base: 0,
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
        title: 'Practice breathing',
        pillar_id: 4,
        trait_id: 9,
        stat_id: 33,
        is_active: true,
      });

    expect(response.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('information_schema.columns'),
      [
        'tasks',
        ['stat_id', 'completed_at', 'archived_at'],
      ],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO tasks'),
      [
        taskId,
        userId,
        'group-3',
        'Practice breathing',
        4,
        9,
        null,
        0,
        true,
      ],
    );
    expect(response.body.task).toMatchObject({
      stat_id: 33,
    });
  });

  it('falls back to null when completed_at or archived_at columns are missing', async () => {
    const taskId = 'dddddddd-eeee-ffff-0000-111111111111';
    mockRandomUUID.mockReturnValueOnce(taskId);
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_111',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ tasks_group_id: 'group-4' }] })
      .mockResolvedValueOnce({
        rows: [{ column_name: 'stat_id' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: taskId,
            user_id: userId,
            tasks_group_id: 'group-4',
            task: 'Plan the week',
            pillar_id: null,
            trait_id: null,
            stat_id: null,
            difficulty_id: null,
            xp_base: 0,
            active: true,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

    const response = await request(app)
      .post(`/api/users/${userId}/tasks`)
      .set('Authorization', 'Bearer token')
      .send({
        title: 'Plan the week',
        is_active: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.task).toMatchObject({
      completed_at: null,
      archived_at: null,
    });
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
