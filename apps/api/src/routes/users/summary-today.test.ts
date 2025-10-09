import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnsureUserExists, mockPoolQuery } = vi.hoisted(() => ({
  mockEnsureUserExists: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock('../../controllers/users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
}));

function createResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();

  return { status, json } as unknown as Response;
}

describe('getUserSummaryToday', () => {
  beforeEach(() => {
    mockEnsureUserExists.mockReset();
    mockPoolQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 400 for invalid user id', async () => {
    const { getUserSummaryToday } = await import('./summary-today.js');
    const req = { params: { id: 'bad-id' } } as unknown as Request;
    const res = createResponse();

    await getUserSummaryToday(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'bad_request', detail: 'invalid uuid' });
    expect(mockEnsureUserExists).not.toHaveBeenCalled();
  });

  it('normalizes xp and quest data for the response body', async () => {
    const { getUserSummaryToday } = await import('./summary-today.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', date: '2024-05-10', xp_today: '42' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', total: '5', completed: '3' }] });

    const req = { params: { id: 'f2f9a6fd-1a1f-4f6e-a049-8f02d9b0d8ef' } } as unknown as Request;
    const res = createResponse();

    await getUserSummaryToday(req, res, vi.fn());

    expect(mockEnsureUserExists).toHaveBeenCalledWith('f2f9a6fd-1a1f-4f6e-a049-8f02d9b0d8ef');
    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-10',
      xp_today: 42,
      quests: { total: 5, completed: 3 },
    });
  });

  it('falls back to zero values when the views return no rows', async () => {
    const { getUserSummaryToday } = await import('./summary-today.js');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T00:00:00Z'));

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

    const req = { params: { id: '8a8c0134-65ae-4d1b-9c96-18e19e5745a2' } } as unknown as Request;
    const res = createResponse();

    await getUserSummaryToday(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-15',
      xp_today: 0,
      quests: { total: 0, completed: 0 },
    });
  });
});
