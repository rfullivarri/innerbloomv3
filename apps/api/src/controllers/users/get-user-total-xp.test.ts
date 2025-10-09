import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserTotalXp } from './get-user-total-xp.js';

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

function createResponse(): Response {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserTotalXp', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
  });

  it('returns the aggregated XP total for an existing user', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({ rows: [{ total_xp: '345' }] });

    const req = {
      params: { id: '91ae0fb9-0f1d-44aa-a399-89cf3a385136' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserTotalXp(req, res, next);

    expect(mockEnsureUserExists).toHaveBeenCalledWith('91ae0fb9-0f1d-44aa-a399-89cf3a385136');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM v_user_total_xp'),
      ['91ae0fb9-0f1d-44aa-a399-89cf3a385136'],
    );
    expect(res.json).toHaveBeenCalledWith({ total_xp: 345 });
    expect(next).not.toHaveBeenCalled();
  });

  it('defaults to 0 XP when the view returns no rows', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: '1bcd4a0c-909b-41e7-8aa8-039706b4f2b5' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserTotalXp(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ total_xp: 0 });
    expect(next).not.toHaveBeenCalled();
  });
});
