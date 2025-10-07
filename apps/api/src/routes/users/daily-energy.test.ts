import type { Request, Response } from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getUserDailyEnergy } from './daily-energy.js';

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
  const status = vi.fn().mockReturnThis();

  return {
    status,
    json,
  } as unknown as Response;
}

describe('getUserDailyEnergy', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns 400 when the user id is not a valid uuid', async () => {
    const req = { params: { id: 'invalid-id' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserDailyEnergy(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad_request', detail: 'invalid uuid' });
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when no daily energy row is found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserDailyEnergy(req, res, next);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not_found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns the normalized daily energy snapshot when present', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'dedb5d95-244c-47b7-922c-c256d8930723',
          hp_pct: '56.2',
          mood_pct: '30.1',
          focus_pct: '34.0',
          hp_norm: '0.562',
          mood_norm: '0.301',
          focus_norm: '0.34',
        },
      ],
    });

    const req = { params: { id: 'dedb5d95-244c-47b7-922c-c256d8930723' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserDailyEnergy(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM v_user_daily_energy'), [
      'dedb5d95-244c-47b7-922c-c256d8930723',
    ]);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'dedb5d95-244c-47b7-922c-c256d8930723',
      hp_pct: 56.2,
      mood_pct: 30.1,
      focus_pct: 34,
      hp_norm: 0.562,
      mood_norm: 0.301,
      focus_norm: 0.34,
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
