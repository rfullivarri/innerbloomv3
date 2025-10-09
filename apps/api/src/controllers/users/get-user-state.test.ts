import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cacheInstances,
  mockAddDays,
  mockComputeDailyTargets,
  mockComputeDecayRates,
  mockComputeGainFactors,
  mockComputeHalfLife,
  mockEnumerateDates,
  mockFormatDateInTimezone,
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
    mockComputeDecayRates: vi.fn(),
    mockComputeGainFactors: vi.fn(),
    mockComputeHalfLife: vi.fn(),
    mockEnumerateDates: vi.fn(),
    mockFormatDateInTimezone: vi.fn(),
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
  computeGainFactors: mockComputeGainFactors,
  computeHalfLife: mockComputeHalfLife,
  computeDecayRates: mockComputeDecayRates,
  enumerateDates: mockEnumerateDates,
  formatDateInTimezone: mockFormatDateInTimezone,
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

let getUserState: typeof import('./get-user-state.js')['getUserState'];

describe('getUserState', () => {
  beforeEach(() => {
    for (const cache of cacheInstances) {
      cache.clear();
    }

    mockAddDays.mockReset();
    mockComputeDailyTargets.mockReset();
    mockComputeDecayRates.mockReset();
    mockComputeGainFactors.mockReset();
    mockComputeHalfLife.mockReset();
    mockEnumerateDates.mockReset();
    mockFormatDateInTimezone.mockReset();
    mockGetDailyXpSeriesByPillar.mockReset();
    mockGetUserLogStats.mockReset();
    mockGetUserProfile.mockReset();
    mockGetXpBaseByPillar.mockReset();
    mockPropagateEnergy.mockReset();
  });

  it('computes the state payload and caches the response', async () => {
    ({ getUserState } = await import('./get-user-state.js'));

    mockGetUserProfile.mockResolvedValue({
      modeCode: 'focus',
      modeName: 'Focus Mode',
      weeklyTarget: 700,
      timezone: 'America/Los_Angeles',
    });
    mockGetUserLogStats.mockResolvedValue({ firstDate: '2024-05-01', uniqueDays: 5 });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 10, Mind: 15, Soul: 20 });
    mockComputeHalfLife.mockReturnValue({ Body: 2, Mind: 3, Soul: 4 });
    mockComputeDecayRates.mockReturnValue({ Body: 0.5, Mind: 0.4, Soul: 0.3 });
    mockComputeDailyTargets.mockReturnValue({ Body: 5, Mind: 7, Soul: 9 });
    mockComputeGainFactors.mockReturnValue({ Body: 1.1, Mind: 1.2, Soul: 1.3 });
    mockFormatDateInTimezone.mockReturnValue('2024-05-10');
    mockAddDays.mockReturnValue('2024-05-06');
    mockEnumerateDates.mockReturnValue(['2024-05-01', '2024-05-10']);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(
      new Map([
        ['2024-05-10', { Body: 12, Mind: 8, Soul: 4 }],
      ]),
    );
    mockPropagateEnergy.mockReturnValue({
      lastEnergy: { Body: 80, Mind: 60, Soul: 70 },
    });

    const req = { params: { id: 'a8fe4ce4-5d63-45da-b8dd-4db5f2872a5a' } } as unknown as Request;
    const res = createResponse();

    await getUserState(req, res, vi.fn());

    expect(mockGetUserProfile).toHaveBeenCalledWith('a8fe4ce4-5d63-45da-b8dd-4db5f2872a5a');
    expect(mockPropagateEnergy).toHaveBeenCalledWith({
      dates: ['2024-05-01', '2024-05-10'],
      xpByDate: new Map([
        ['2024-05-10', { Body: 12, Mind: 8, Soul: 4 }],
      ]),
      halfLifeByPillar: { Body: 2, Mind: 3, Soul: 4 },
      dailyTargets: { Body: 5, Mind: 7, Soul: 9 },
      forceFullGrace: true,
      graceUntilDate: '2024-05-06',
    });
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-10',
      mode: 'Focus Mode',
      mode_name: 'Focus Mode',
      weekly_target: 700,
      grace: {
        applied: true,
        unique_days: 5,
      },
      pillars: {
        Body: {
          hp: 80,
          xp_today: 12,
          d: 0.5,
          k: 1.1,
          H: 2,
          xp_obj_day: 5,
        },
        Mind: {
          focus: 60,
          xp_today: 8,
          d: 0.4,
          k: 1.2,
          H: 3,
          xp_obj_day: 7,
        },
        Soul: {
          mood: 70,
          xp_today: 4,
          d: 0.3,
          k: 1.3,
          H: 4,
          xp_obj_day: 9,
        },
      },
    });

    res.json.mockClear();

    await getUserState(req, res, vi.fn());

    expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-10',
      mode: 'Focus Mode',
      mode_name: 'Focus Mode',
      weekly_target: 700,
      grace: {
        applied: true,
        unique_days: 5,
      },
      pillars: {
        Body: {
          hp: 80,
          xp_today: 12,
          d: 0.5,
          k: 1.1,
          H: 2,
          xp_obj_day: 5,
        },
        Mind: {
          focus: 60,
          xp_today: 8,
          d: 0.4,
          k: 1.2,
          H: 3,
          xp_obj_day: 7,
        },
        Soul: {
          mood: 70,
          xp_today: 4,
          d: 0.3,
          k: 1.3,
          H: 4,
          xp_obj_day: 9,
        },
      },
    });
  });

  it('handles users without logs and disables grace when the streak has finished', async () => {
    ({ getUserState } = await import('./get-user-state.js'));

    mockGetUserProfile.mockResolvedValue({
      modeCode: 'chill',
      modeName: null,
      weeklyTarget: 350,
      timezone: 'UTC',
    });
    mockGetUserLogStats.mockResolvedValue({ firstDate: null, uniqueDays: 10 });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 5, Mind: 5, Soul: 5 });
    mockComputeHalfLife.mockReturnValue({ Body: 1, Mind: 1, Soul: 1 });
    mockComputeDecayRates.mockReturnValue({ Body: 0.2, Mind: 0.2, Soul: 0.2 });
    mockComputeDailyTargets.mockReturnValue({ Body: 1, Mind: 1, Soul: 1 });
    mockComputeGainFactors.mockReturnValue({ Body: 1, Mind: 1, Soul: 1 });
    mockFormatDateInTimezone.mockReturnValue('2024-05-20');
    mockEnumerateDates
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['2024-05-20']);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(new Map());
    mockPropagateEnergy.mockReturnValue({
      series: [{ date: '2024-05-20', Body: 50, Mind: 60, Soul: 40 }],
      lastEnergy: { Body: 50, Mind: 60, Soul: 40 },
    });

    const req = { params: { id: '6135f5a3-b9fa-4c6e-8f32-530c51ca5257' } } as unknown as Request;
    const res = createResponse();

    await getUserState(req, res, vi.fn());

    expect(mockAddDays).not.toHaveBeenCalled();
    expect(mockGetDailyXpSeriesByPillar).not.toHaveBeenCalled();
    expect(mockPropagateEnergy).toHaveBeenCalledWith({
      dates: ['2024-05-20'],
      xpByDate: new Map(),
      halfLifeByPillar: { Body: 1, Mind: 1, Soul: 1 },
      dailyTargets: { Body: 1, Mind: 1, Soul: 1 },
      forceFullGrace: false,
      graceUntilDate: null,
    });
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-20',
      mode: 'chill',
      weekly_target: 350,
      grace: {
        applied: false,
        unique_days: 10,
      },
      pillars: {
        Body: { hp: 50, xp_today: 0, d: 0.2, k: 1, H: 1, xp_obj_day: 1 },
        Mind: { focus: 60, xp_today: 0, d: 0.2, k: 1, H: 1, xp_obj_day: 1 },
        Soul: { mood: 40, xp_today: 0, d: 0.2, k: 1, H: 1, xp_obj_day: 1 },
      },
    });
  });

  it('returns cached responses and handles grace when logs exist but streak finished', async () => {
    ({ getUserState } = await import('./get-user-state.js'));

    mockGetUserProfile.mockResolvedValue({
      modeCode: 'flow',
      modeName: undefined,
      weeklyTarget: 840,
      timezone: 'America/Bogota',
    });
    mockGetUserLogStats.mockResolvedValue({ firstDate: '2024-05-01', uniqueDays: 12 });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 30, Mind: 20, Soul: 10 });
    mockComputeHalfLife.mockReturnValue({ Body: 4, Mind: 4, Soul: 4 });
    mockComputeDecayRates.mockReturnValue({ Body: 0.25, Mind: 0.25, Soul: 0.25 });
    mockComputeDailyTargets.mockReturnValue({ Body: 12, Mind: 10, Soul: 8 });
    mockComputeGainFactors.mockReturnValue({ Body: 1.5, Mind: 1.4, Soul: 1.3 });
    mockFormatDateInTimezone.mockReturnValue('2024-05-15');
    mockAddDays.mockReturnValue('2024-05-07');
    mockEnumerateDates.mockReturnValue(['2024-05-01', '2024-05-15']);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(
      new Map([
        ['2024-05-14', { Body: 5, Mind: 7, Soul: 9 }],
        ['2024-05-15', { Body: 11, Mind: 13, Soul: 17 }],
      ]),
    );
    mockPropagateEnergy.mockReturnValue({
      lastEnergy: { Body: 42, Mind: 24, Soul: 12 },
    });

    const req = { params: { id: '7c3f8b8d-4a97-4bf6-8096-51c1bd926cc8' } } as unknown as Request;
    const res = createResponse();

    await getUserState(req, res, vi.fn());

    expect(mockAddDays).toHaveBeenCalledWith('2024-05-01', 6);
    expect(mockPropagateEnergy).toHaveBeenCalledWith({
      dates: ['2024-05-01', '2024-05-15'],
      xpByDate: expect.any(Map),
      halfLifeByPillar: { Body: 4, Mind: 4, Soul: 4 },
      dailyTargets: { Body: 12, Mind: 10, Soul: 8 },
      forceFullGrace: false,
      graceUntilDate: '2024-05-07',
    });
    const passedXpByDate = mockPropagateEnergy.mock.calls.at(-1)?.[0]?.xpByDate as Map<string, unknown> | undefined;
    expect(passedXpByDate).toBeInstanceOf(Map);
    expect(passedXpByDate?.get('2024-05-15')).toEqual({ Body: 11, Mind: 13, Soul: 17 });
    expect(res.json).toHaveBeenLastCalledWith({
      date: '2024-05-15',
      mode: 'flow',
      weekly_target: 840,
      grace: {
        applied: false,
        unique_days: 12,
      },
      pillars: {
        Body: { hp: 42, xp_today: 11, d: 0.25, k: 1.5, H: 4, xp_obj_day: 12 },
        Mind: { focus: 24, xp_today: 13, d: 0.25, k: 1.4, H: 4, xp_obj_day: 10 },
        Soul: { mood: 12, xp_today: 17, d: 0.25, k: 1.3, H: 4, xp_obj_day: 8 },
      },
    });

    res.json.mockClear();

    await getUserState(req, res, vi.fn());

    expect(mockGetUserProfile).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      date: '2024-05-15',
      mode: 'flow',
      weekly_target: 840,
      grace: {
        applied: false,
        unique_days: 12,
      },
      pillars: {
        Body: { hp: 42, xp_today: 11, d: 0.25, k: 1.5, H: 4, xp_obj_day: 12 },
        Mind: { focus: 24, xp_today: 13, d: 0.25, k: 1.4, H: 4, xp_obj_day: 10 },
        Soul: { mood: 12, xp_today: 17, d: 0.25, k: 1.3, H: 4, xp_obj_day: 8 },
      },
    });
  });
});
