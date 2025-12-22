import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserDailyEnergy } from './daily-energy.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

const stateServiceMocks = vi.hoisted(() => {
  const addDays = vi.fn((date: string, delta: number) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + delta);
    return parsed.toISOString().slice(0, 10);
  });

  return {
    addDays,
    computeDailyTargets: vi.fn().mockReturnValue({ Body: 10, Mind: 10, Soul: 10 }),
    computeHalfLife: vi.fn().mockReturnValue({ Body: 5, Mind: 5, Soul: 5 }),
    enumerateDates: vi.fn().mockReturnValue(['2024-05-01', '2024-05-08']),
    formatDateInTimezone: vi.fn().mockReturnValue('2024-05-08'),
    getDailyXpSeriesByPillar: vi.fn().mockResolvedValue(new Map()),
    getUserLogStats: vi.fn().mockResolvedValue({ uniqueDays: 8, firstDate: '2024-05-01' }),
    getUserProfile: vi.fn().mockResolvedValue({
      userId: 'dedb5d95-244c-47b7-922c-c256d8930723',
      modeCode: 'FLOW',
      modeName: 'Flow',
      weeklyTarget: 70,
      timezone: 'UTC',
    }),
    getXpBaseByPillar: vi.fn().mockResolvedValue({ Body: 10, Mind: 10, Soul: 10 }),
    propagateEnergy: vi.fn().mockReturnValue({
      lastEnergy: { Body: 80, Mind: 60, Soul: 90 },
      series: [
        { date: '2024-05-01', Body: 40, Mind: 50, Soul: 60 },
        { date: '2024-05-08', Body: 80, Mind: 60, Soul: 90 },
      ],
    }),
  };
});

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));
vi.mock('../../controllers/users/user-state-service.js', () => stateServiceMocks);

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
    Object.values(stateServiceMocks).forEach((mockFn) => {
      if ('mockClear' in mockFn && typeof mockFn.mockClear === 'function') {
        mockFn.mockClear();
      }
    });
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

  it('marks comparison data as unavailable when there is not enough history', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'dedb5d95-244c-47b7-922c-c256d8930723',
          hp_pct: '70.0',
          mood_pct: '40.0',
          focus_pct: '60.0',
          hp_norm: '0.7',
          mood_norm: '0.4',
          focus_norm: '0.6',
        },
      ],
    });
    stateServiceMocks.getUserLogStats.mockResolvedValueOnce({ uniqueDays: 3, firstDate: '2024-05-06' });
    stateServiceMocks.enumerateDates.mockReturnValueOnce(['2024-05-06', '2024-05-08']);
    stateServiceMocks.propagateEnergy.mockReturnValueOnce({
      lastEnergy: { Body: 70, Mind: 60, Soul: 50 },
      series: [{ date: '2024-05-06', Body: 60, Mind: 50, Soul: 40 }],
    });

    const req = { params: { id: 'dedb5d95-244c-47b7-922c-c256d8930723' } } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await getUserDailyEnergy(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        trend: {
          currentDate: expect.any(String),
          previousDate: expect.any(String),
          hasHistory: false,
          pillars: expect.objectContaining({
            Body: expect.objectContaining({ previous: null, deltaPct: null }),
          }),
        },
      }),
    );
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
      trend: {
        currentDate: '2024-05-08',
        previousDate: '2024-05-01',
        hasHistory: true,
        pillars: {
          Body: { current: 80, previous: 40, deltaPct: 100 },
          Mind: { current: 60, previous: 50, deltaPct: 20 },
          Soul: { current: 90, previous: 60, deltaPct: 50 },
        },
      },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
