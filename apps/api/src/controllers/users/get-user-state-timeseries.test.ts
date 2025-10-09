import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cacheInstances,
  mockAddDays,
  mockComputeDailyTargets,
  mockComputeHalfLife,
  mockEnumerateDates,
  mockGetDailyXpSeriesByPillar,
  mockGetUserLogStats,
  mockGetUserProfile,
  mockGetXpBaseByPillar,
  mockPropagateEnergy,
} = vi.hoisted(() => {
  const cacheRefs: Array<{ clear: () => void }> = [];

  return {
    cacheInstances: cacheRefs,
    mockAddDays: vi.fn(),
    mockComputeDailyTargets: vi.fn(),
    mockComputeHalfLife: vi.fn(),
    mockEnumerateDates: vi.fn(),
    mockGetDailyXpSeriesByPillar: vi.fn(),
    mockGetUserLogStats: vi.fn(),
    mockGetUserProfile: vi.fn(),
    mockGetXpBaseByPillar: vi.fn(),
    mockPropagateEnergy: vi.fn(),
  };
});

vi.mock('../../lib/simple-cache.js', () => {
  class FakeCache<V> {
    private readonly store = new Map<string, V>();

    constructor() {
      cacheInstances.push({
        clear: () => {
          this.store.clear();
        },
      });
    }

    get(key: string): V | undefined {
      return this.store.get(key);
    }

    set(key: string, value: V): void {
      this.store.set(key, value);
    }

    delete(key: string): void {
      this.store.delete(key);
    }

    clear(): void {
      this.store.clear();
    }
  }

  return { SimpleTtlCache: FakeCache };
});

vi.mock('./user-state-service.js', () => ({
  addDays: mockAddDays,
  computeDailyTargets: mockComputeDailyTargets,
  computeHalfLife: mockComputeHalfLife,
  enumerateDates: mockEnumerateDates,
  getDailyXpSeriesByPillar: mockGetDailyXpSeriesByPillar,
  getUserLogStats: mockGetUserLogStats,
  getUserProfile: mockGetUserProfile,
  getXpBaseByPillar: mockGetXpBaseByPillar,
  propagateEnergy: mockPropagateEnergy,
}));

function createResponse() {
  const json = vi.fn();

  return { json } as unknown as Response;
}

let getUserStateTimeseries: typeof import('./get-user-state-timeseries.js')['getUserStateTimeseries'];

describe('getUserStateTimeseries', () => {
  beforeEach(() => {
    for (const cache of cacheInstances) {
      cache.clear();
    }

    mockAddDays.mockReset();
    mockComputeDailyTargets.mockReset();
    mockComputeHalfLife.mockReset();
    mockEnumerateDates.mockReset();
    mockGetDailyXpSeriesByPillar.mockReset();
    mockGetUserLogStats.mockReset();
    mockGetUserProfile.mockReset();
    mockGetXpBaseByPillar.mockReset();
    mockPropagateEnergy.mockReset();
  });

  it('validates the requested range', async () => {
    ({ getUserStateTimeseries } = await import('./get-user-state-timeseries.js'));

    const req = {
      params: { id: '1c441a6e-7fb9-4d4c-9c40-7a3dc7bfca16' },
      query: { from: 'invalid-date', to: '2024-05-10' },
    } as unknown as Request;

    await expect(getUserStateTimeseries(req, createResponse(), vi.fn())).rejects.toMatchObject({
      status: 400,
      code: 'invalid_date',
    });
  });

  it('rejects ranges where from is after to', async () => {
    ({ getUserStateTimeseries } = await import('./get-user-state-timeseries.js'));

    const req = {
      params: { id: '1c441a6e-7fb9-4d4c-9c40-7a3dc7bfca16' },
      query: { from: '2024-05-10', to: '2024-05-01' },
    } as unknown as Request;

    await expect(getUserStateTimeseries(req, createResponse(), vi.fn())).rejects.toMatchObject({
      status: 400,
      code: 'invalid_date_range',
    });
  });

  it('computes the energy timeseries and caches the payload', async () => {
    ({ getUserStateTimeseries } = await import('./get-user-state-timeseries.js'));

    mockGetUserProfile.mockResolvedValue({
      modeCode: 'flow',
      modeName: 'Flow',
      weeklyTarget: 700,
      timezone: 'UTC',
    });
    mockGetUserLogStats.mockResolvedValue({ firstDate: '2024-05-01', uniqueDays: 10 });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 10, Mind: 20, Soul: 30 });
    mockComputeHalfLife.mockReturnValue({ Body: 1, Mind: 2, Soul: 3 });
    mockComputeDailyTargets.mockReturnValue({ Body: 5, Mind: 6, Soul: 7 });
    mockAddDays.mockReturnValue('2024-05-07');
    mockEnumerateDates.mockImplementation((from: string, to: string) => [from, to]);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(
      new Map([
        ['2024-05-01', { Body: 5 }],
        ['2024-05-10', { Mind: 3 }],
      ]),
    );
    mockPropagateEnergy.mockReturnValue({
      series: [
        { date: '2024-05-01', Body: 90, Mind: 80, Soul: 70 },
        { date: '2024-05-05', Body: 85, Mind: 75, Soul: 65 },
        { date: '2024-05-10', Body: 88, Mind: 82, Soul: 60 },
      ],
    });

    const req = {
      params: { id: 'fddc6f6f-2cde-4fc5-8e7f-9aa6c4d49c45' },
      query: { from: '2024-05-01', to: '2024-05-10' },
    } as unknown as Request;
    const res = createResponse();

    await getUserStateTimeseries(req, res, vi.fn());

    expect(mockPropagateEnergy).toHaveBeenCalledWith({
      dates: ['2024-05-01', '2024-05-10'],
      xpByDate: new Map([
        ['2024-05-01', { Body: 5 }],
        ['2024-05-10', { Mind: 3 }],
      ]),
      halfLifeByPillar: { Body: 1, Mind: 2, Soul: 3 },
      dailyTargets: { Body: 5, Mind: 6, Soul: 7 },
      forceFullGrace: false,
      graceUntilDate: '2024-05-07',
    });
    expect(res.json).toHaveBeenCalledWith([
      { date: '2024-05-01', Body: 90, Mind: 80, Soul: 70 },
      { date: '2024-05-05', Body: 85, Mind: 75, Soul: 65 },
      { date: '2024-05-10', Body: 88, Mind: 82, Soul: 60 },
    ]);

    res.json.mockClear();

    await getUserStateTimeseries(req, res, vi.fn());

    expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith([
      { date: '2024-05-01', Body: 90, Mind: 80, Soul: 70 },
      { date: '2024-05-05', Body: 85, Mind: 75, Soul: 65 },
      { date: '2024-05-10', Body: 88, Mind: 82, Soul: 60 },
    ]);
  });
});
