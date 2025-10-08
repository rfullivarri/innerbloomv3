import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';
import { getUserPillars } from './pillars.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

function createMockResponse() {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserPillars', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('throws an error when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const req = { params: { id: '2bfada59-309e-4ca8-8458-95e7071cff5a' } } as unknown as Request;
    const res = createMockResponse();

    await expect(getUserPillars(req, res, vi.fn())).rejects.toBeInstanceOf(HttpError);

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns pillar metrics merging totals and weekly xp', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ weekly_target: 600 }],
      })
      .mockResolvedValueOnce({
        rows: [
          { pillar_code: 'BODY', xp_total: '1234.5' },
          { pillar_code: 'MIND', xp_total: 980 },
          { pillar_code: 'SOUL', xp_total: null },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { pillar_code: 'BODY', xp_week: '320' },
          { pillar_code: 'MIND', xp_week: '90.4' },
        ],
      });

    const req = { params: { id: '01f5df47-f9a8-4a72-9244-b7ecb68a10bc' } } as unknown as Request;
    const res = createMockResponse();

    await getUserPillars(req, res, vi.fn());

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM users'),
      ['01f5df47-f9a8-4a72-9244-b7ecb68a10bc'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM v_user_xp_by_pillar'),
      ['01f5df47-f9a8-4a72-9244-b7ecb68a10bc'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('FROM v_user_pillars_week'),
      ['01f5df47-f9a8-4a72-9244-b7ecb68a10bc'],
    );

    expect(res.json).toHaveBeenCalledWith({
      user_id: '01f5df47-f9a8-4a72-9244-b7ecb68a10bc',
      pillars: [
        { code: 'BODY', xp: 1235, xp_week: 320, progress_pct: 53 },
        { code: 'MIND', xp: 980, xp_week: 90, progress_pct: 15 },
        { code: 'SOUL', xp: 0, xp_week: 0, progress_pct: 0 },
      ],
    });
  });
});
