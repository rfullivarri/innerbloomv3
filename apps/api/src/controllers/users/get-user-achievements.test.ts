import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserAchievements } from './get-user-achievements.js';

const { mockQuery, mockEnsureUserExists } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock('./shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();

  return {
    json,
    status,
  } as unknown as Response;
}

describe('getUserAchievements', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
  });

  it('returns 400 when the user id is not a valid uuid', async () => {
    const req = { params: { id: 'invalid-id' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserAchievements(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad_request', detail: 'invalid uuid' });
    expect(mockEnsureUserExists).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns derived progress for streak and level achievements', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { date: '2024-05-10', xp_day: '10' },
          { date: '2024-05-09', xp_day: '5' },
          { date: '2024-05-08', xp_day: '0' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ total_xp: '1800' }],
      })
      ;

    const req = { params: { id: 'dedb5d95-244c-47b7-922c-c256d8930723' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserAchievements(req, res, next);

    expect(mockEnsureUserExists).toHaveBeenCalledWith('dedb5d95-244c-47b7-922c-c256d8930723');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM v_user_daily_xp'),
      ['dedb5d95-244c-47b7-922c-c256d8930723'],
    );
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'dedb5d95-244c-47b7-922c-c256d8930723',
      achievements: [
        {
          id: 'ach_streak_7',
          name: '7-Day Flame',
          earned_at: null,
          progress: {
            current: 2,
            target: 7,
            pct: 28.6,
          },
        },
        {
          id: 'ach_level_5',
          name: 'Level 5',
          earned_at: null,
          progress: {
            current: 9,
            target: 5,
            pct: 100,
          },
        },
      ],
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
