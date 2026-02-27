import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserJourney } from './get-user-journey.js';

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

describe('getUserJourney', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
  });

  it('returns journey stats when the user has logs', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          first_date_log: '2024-04-01',
          days_of_journey: '14',
          quantity_daily_logs: '10',
          first_programmed: true,
          first_tasks_confirmed: false,
          completed_first_daily_quest: true,
        },
      ],
    });

    const req = {
      params: { id: 'a5305d28-dac7-41c4-8a64-6c59c99fd038' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserJourney(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM users u'),
      ['a5305d28-dac7-41c4-8a64-6c59c99fd038'],
    );
    expect(res.json).toHaveBeenCalledWith({
      first_date_log: '2024-04-01',
      days_of_journey: 14,
      quantity_daily_logs: 10,
      first_programmed: true,
      first_tasks_confirmed: false,
      completed_first_daily_quest: true,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to zeroed stats when there are no logs', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          first_date_log: null,
          days_of_journey: null,
          quantity_daily_logs: null,
          first_programmed: false,
          first_tasks_confirmed: false,
          completed_first_daily_quest: false,
        },
      ],
    });

    const req = {
      params: { id: '6c381dfb-5db4-4a7f-9d44-8eb9d4808212' },
    } as unknown as Request;
    const res = createResponse();

    await getUserJourney(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      first_date_log: null,
      days_of_journey: 0,
      quantity_daily_logs: 0,
      first_programmed: false,
      first_tasks_confirmed: false,
      completed_first_daily_quest: false,
    });
  });
});
