import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken, mockWithClient, mockClientQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockWithClient: vi.fn(),
  mockClientQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
  withClient: (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    mockWithClient(callback),
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

describe('Daily Quest routes', () => {
  const client = { query: mockClientQuery };

  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockWithClient.mockReset();
    mockClientQuery.mockReset();

    mockWithClient.mockImplementation(async (callback) => {
      return callback(client);
    });
  });

  it('requires authentication for status', async () => {
    const response = await request(app).get('/api/daily-quest/status');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('defaults the date to the user timezone when missing', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'America/Bogota',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ submitted_at: null }] });

    const response = await request(app)
      .get('/api/daily-quest/status')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ date: '2024-03-10', submitted: false, submitted_at: null });

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM users'),
      ['user-1'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM (\n              SELECT created_at\n                FROM daily_log'),
      ['user-1', '2024-03-10'],
    );
  });

  it('rejects tasks that do not belong to the user tasks group', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-12',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
            task: 'Breathing',
            trait_id: 1,
            difficulty_id: 1,
            difficulty_code: 'EASY',
            xp_base: 10,
            pillar_code: 'BODY',
          },
        ],
      });

    const response = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send({
        emotion_id: 1,
        tasks_done: [{ task_id: 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb' }],
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      code: 'invalid_task',
      message: 'Task does not belong to the user',
    });
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  it('upserts submissions idempotently and returns xp totals', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
            task: 'Hydrate',
            trait_id: 1,
            difficulty_id: 1,
            difficulty_code: 'EASY',
            xp_base: 10,
            pillar_code: 'BODY',
          },
          {
            task_id: 'cccccccc-3333-3333-3333-cccccccccccc',
            task: 'Meditate',
            trait_id: 2,
            difficulty_id: 2,
            difficulty_code: 'MED',
            xp_base: 20,
            pillar_code: 'MIND',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { date: '2024-03-10', xp_day: '10' },
          { date: '2024-03-09', xp_day: '5' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { week_start: '2024-03-04', xp_week: '15' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { date: '2024-03-10', xp_day: '25' },
          { date: '2024-03-09', xp_day: '5' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { week_start: '2024-03-04', xp_week: '30' },
        ],
      });

    mockClientQuery.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send({
        date: '2024-03-10',
        emotion_id: 2,
        tasks_done: [{ task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa' }],
        notes: 'Great day',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      saved: {
        emotion: { emotion_id: 2, date: '2024-03-10', notes: 'Great day' },
        tasks: { date: '2024-03-10', completed: ['aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'] },
      },
      xp_delta: 15,
      xp_total_today: 25,
      streaks: { daily: 2, weekly: 1 },
      missions_v2: { bonus_ready: false, redirect_url: '/dashboard-v3/missions-v2' },
    });

    expect(mockClientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO emotions_logs'),
      ['user-1', '2024-03-10', 2],
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM daily_log'),
      ['user-1', '2024-03-10', ['cccccccc-3333-3333-3333-cccccccccccc']],
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO daily_log'),
      ['user-1', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', '2024-03-10', 1],
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('COMMIT');
  });

  it('returns 422 when the emotion does not exist', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send({ emotion_id: 999, tasks_done: [] });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      code: 'invalid_emotion',
      message: 'Emotion not found',
    });
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  it('allows submitting only an emotion without tasks', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
            task: 'Hydrate',
            trait_id: 1,
            difficulty_id: 1,
            difficulty_code: 'EASY',
            xp_base: 10,
            pillar_code: 'BODY',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '0' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '0' }] })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '0' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '0' }] });

    mockClientQuery.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send({ emotion_id: 1, tasks_done: [] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      saved: {
        emotion: { emotion_id: 1, date: '2024-03-10', notes: null },
        tasks: { date: '2024-03-10', completed: [] },
      },
      xp_delta: 0,
      xp_total_today: 0,
      streaks: { daily: 0, weekly: 0 },
      missions_v2: { bonus_ready: false, redirect_url: '/dashboard-v3/missions-v2' },
    });

    expect(mockClientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO emotions_logs'),
      ['user-1', '2024-03-10', 1],
    );
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM daily_log'),
      ['user-1', '2024-03-10', ['aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa']],
    );
    expect(mockClientQuery).toHaveBeenLastCalledWith('COMMIT');
  });

  it('is idempotent across consecutive submissions', async () => {
    mockVerifyToken.mockResolvedValue({ id: 'user-1', clerkId: 'clerk-1', email: null, isNew: false });

    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
            task: 'Hydrate',
            trait_id: 1,
            difficulty_id: 1,
            difficulty_code: 'EASY',
            xp_base: 10,
            pillar_code: 'BODY',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '10' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '15' }] })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '25' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '30' }] })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tasks_group_id: 'group-1',
            timezone: 'UTC',
            today: '2024-03-10',
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
            task: 'Hydrate',
            trait_id: 1,
            difficulty_id: 1,
            difficulty_code: 'EASY',
            xp_base: 10,
            pillar_code: 'BODY',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '25' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '30' }] })
      .mockResolvedValueOnce({ rows: [{ date: '2024-03-10', xp_day: '25' }] })
      .mockResolvedValueOnce({ rows: [{ week_start: '2024-03-04', xp_week: '30' }] });

    mockClientQuery.mockResolvedValue(undefined);

    const payload = {
      emotion_id: 2,
      tasks_done: [{ task_id: 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa' }],
    };

    const firstResponse = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.xp_delta).toBe(15);
    expect(firstResponse.body.xp_total_today).toBe(25);

    const secondResponse = await request(app)
      .post('/api/daily-quest/submit')
      .set('Authorization', 'Bearer token')
      .send(payload);

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.xp_delta).toBe(0);
    expect(secondResponse.body.xp_total_today).toBe(25);
  });
});
