import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';
import { mockReq, mockRes } from '../../tests/test-utils.js';

const serviceMocks = vi.hoisted(() => ({
  addDays: vi.fn(),
  computeDailyTargets: vi.fn(),
  computeHalfLife: vi.fn(),
  enumerateDates: vi.fn(),
  getDailyXpSeriesByPillar: vi.fn(),
  getUserLogStats: vi.fn(),
  getUserProfile: vi.fn(),
  getXpBaseByPillar: vi.fn(),
  propagateEnergy: vi.fn(),
}));

vi.mock('./user-state-service.js', () => ({
  addDays: serviceMocks.addDays,
  computeDailyTargets: serviceMocks.computeDailyTargets,
  computeHalfLife: serviceMocks.computeHalfLife,
  enumerateDates: serviceMocks.enumerateDates,
  getDailyXpSeriesByPillar: serviceMocks.getDailyXpSeriesByPillar,
  getUserLogStats: serviceMocks.getUserLogStats,
  getUserProfile: serviceMocks.getUserProfile,
  getXpBaseByPillar: serviceMocks.getXpBaseByPillar,
  propagateEnergy: serviceMocks.propagateEnergy,
}));

describe('getUserStateTimeseries', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('throws when the date range is invalid', async () => {
    const { getUserStateTimeseries } = await import('./get-user-state-timeseries.js');
    const req = mockReq({
      params: { id: '11111111-2222-3333-4444-555555555555' },
      query: { from: '2024-13-01', to: '2024-01-10' },
    });
    const res = mockRes();

    await expect(getUserStateTimeseries(req, res, vi.fn())).rejects.toBeInstanceOf(HttpError);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('filters the propagated series and caches results', async () => {
    const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const propagationDates: string[] = ['2024-01-01', '2024-01-02', '2024-01-03'];

    serviceMocks.getUserProfile.mockResolvedValue({
      userId,
      modeCode: 'FOCUS',
      modeName: null,
      weeklyTarget: 900,
      timezone: 'UTC',
    });
    serviceMocks.getUserLogStats.mockResolvedValue({ uniqueDays: 10, firstDate: '2023-12-15' });
    serviceMocks.getXpBaseByPillar.mockResolvedValue({ Body: 5, Mind: 6, Soul: 7 });
    serviceMocks.computeHalfLife.mockReturnValue({ Body: 2, Mind: 3, Soul: 4 });
    serviceMocks.computeDailyTargets.mockReturnValue({ Body: 1, Mind: 2, Soul: 3 });
    serviceMocks.addDays.mockReturnValue('2023-12-21');
    serviceMocks.enumerateDates.mockImplementation((from: string, to: string) => {
      const dates: string[] = [];
      const start = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${to}T00:00:00.000Z`);
      for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        dates.push(cursor.toISOString().slice(0, 10));
      }
      return dates;
    });
    serviceMocks.getDailyXpSeriesByPillar.mockResolvedValue(
      new Map<string, Partial<Record<'Body' | 'Mind' | 'Soul', number>>>([
        ['2024-01-01', { Body: 4, Mind: 3, Soul: 2 }],
        ['2024-01-02', { Body: 5, Mind: 1, Soul: 0 }],
        ['2024-01-03', { Body: 2, Mind: 2, Soul: 1 }],
      ]),
    );
    serviceMocks.propagateEnergy.mockReturnValue({
      lastEnergy: { Body: 80, Mind: 70, Soul: 60 },
      series: [
        { date: '2024-01-01', Body: 80, Mind: 70, Soul: 60 },
        { date: '2024-01-02', Body: 82, Mind: 72, Soul: 62 },
        { date: '2024-01-03', Body: 84, Mind: 74, Soul: 64 },
        { date: '2024-01-04', Body: 86, Mind: 76, Soul: 66 },
      ],
    });

    const { getUserStateTimeseries } = await import('./get-user-state-timeseries.js');
    const req = mockReq({
      params: { id: userId },
      query: { from: '2024-01-01', to: '2024-01-03' },
    });
    const res = mockRes();

    await getUserStateTimeseries(req, res, vi.fn());

    expect(serviceMocks.getUserProfile).toHaveBeenCalledTimes(1);
    expect(serviceMocks.enumerateDates).toHaveBeenCalledWith('2023-12-15', '2024-01-03');
    expect(serviceMocks.propagateEnergy).toHaveBeenCalledWith({
      dates: propagationDates,
      xpByDate: expect.any(Map),
      halfLifeByPillar: { Body: 2, Mind: 3, Soul: 4 },
      dailyTargets: { Body: 1, Mind: 2, Soul: 3 },
      forceFullGrace: false,
      graceUntilDate: '2023-12-21',
    });

    expect(res.json).toHaveBeenCalledWith([
      { date: '2024-01-01', Body: 80, Mind: 70, Soul: 60 },
      { date: '2024-01-02', Body: 82, Mind: 72, Soul: 62 },
      { date: '2024-01-03', Body: 84, Mind: 74, Soul: 64 },
    ]);

    const nextRes = mockRes();
    await getUserStateTimeseries(req, nextRes, vi.fn());

    expect(serviceMocks.getUserProfile).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getDailyXpSeriesByPillar).toHaveBeenCalledTimes(1);
    expect(nextRes.json).toHaveBeenCalledWith([
      { date: '2024-01-01', Body: 80, Mind: 70, Soul: 60 },
      { date: '2024-01-02', Body: 82, Mind: 72, Soul: 62 },
      { date: '2024-01-03', Body: 84, Mind: 74, Soul: 64 },
    ]);
  });
});
