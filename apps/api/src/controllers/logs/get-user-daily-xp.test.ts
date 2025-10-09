import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserDailyXp } from './get-user-daily-xp.js';

const { mockQuery, mockEnsureUserExists } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock('../users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

function createResponse(): Response {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserDailyXp', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the XP series for the provided date range', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [
        { date: '2024-05-01', xp_day: '10' },
        { date: '2024-05-02', xp_day: 0 },
        { date: '2024-05-03', xp_day: '25' },
      ],
    });

    const req = {
      params: { id: '0f6f566a-46b4-4dbc-95f9-7f42ec7dfadb' },
      query: { from: '2024-05-01', to: '2024-05-03' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserDailyXp(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM v_user_daily_xp'),
      ['0f6f566a-46b4-4dbc-95f9-7f42ec7dfadb', '2024-05-01', '2024-05-03'],
    );
    expect(res.json).toHaveBeenCalledWith({
      from: '2024-05-01',
      to: '2024-05-03',
      series: [
        { date: '2024-05-01', xp_day: 10 },
        { date: '2024-05-02', xp_day: 0 },
        { date: '2024-05-03', xp_day: 25 },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('defaults to the last 30 days when no dates are provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-10T12:00:00Z'));

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: '74d17449-770d-46df-9ace-1b9a5a7d4141' },
      query: {},
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserDailyXp(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM v_user_daily_xp'),
      ['74d17449-770d-46df-9ace-1b9a5a7d4141', '2024-04-11', '2024-05-10'],
    );
    expect(res.json).toHaveBeenCalledWith({
      from: '2024-04-11',
      to: '2024-05-10',
      series: [],
    });
  });

  it('surfaces invalid ranges as HTTP errors', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);

    const req = {
      params: { id: '9fce4475-4c21-4451-8dde-0ba8b53f3615' },
      query: { from: '2024-05-05', to: '2024-05-01' },
    } as unknown as Request;
    const res = createResponse();

    await expect(getUserDailyXp(req, res, vi.fn())).rejects.toMatchObject({
      status: 400,
      code: 'invalid_date_range',
    });
    expect(mockEnsureUserExists).toHaveBeenCalledWith('9fce4475-4c21-4451-8dde-0ba8b53f3615');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
