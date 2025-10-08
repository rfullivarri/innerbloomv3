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

  const status = vi.fn().mockReturnThis();

  return {
    status,

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

  it('returns 400 when the user id is invalid', async () => {
    const req = { params: { id: 'not-a-uuid' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserPillars(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad_request', detail: 'invalid uuid' });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when the user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: '1a2945cb-8ce7-4fe1-934e-0d2a70aa09f1' },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserPillars(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM users u'), [
      '1a2945cb-8ce7-4fe1-934e-0d2a70aa09f1',
    ]);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'user_not_found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns pillar stats with progress capped at 100', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            weekly_target: '70',
          },

        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { pillar_code: 'BODY', xp_total: '120', xp_week: '50' },
          { pillar_code: 'MIND', xp_total: '200', xp_week: '120' },
        ],
      });

    const req = {
      params: { id: 'dedb5d95-244c-47b7-922c-c256d8930723' },
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserPillars(req, res, next);

    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM users u'),
      ['dedb5d95-244c-47b7-922c-c256d8930723'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM daily_log dl'),
      ['dedb5d95-244c-47b7-922c-c256d8930723'],
    );
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'dedb5d95-244c-47b7-922c-c256d8930723',
      pillars: [
        { code: 'BODY', xp: 120, xp_week: 50, progress_pct: 71 },
        { code: 'MIND', xp: 200, xp_week: 120, progress_pct: 100 },
        { code: 'SOUL', xp: 0, xp_week: 0, progress_pct: 0 },
      ],
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
