import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockReq, mockRes } from '../../tests/test-utils.js';

const serviceMocks = vi.hoisted(() => ({
  addDays: vi.fn(),
  computeDailyTargets: vi.fn(),
  computeDecayRates: vi.fn(),
  computeGainFactors: vi.fn(),
  computeHalfLife: vi.fn(),
  enumerateDates: vi.fn(),
  formatDateInTimezone: vi.fn(),
  getDailyXpSeriesByPillar: vi.fn(),
  getUserLogStats: vi.fn(),
  getUserProfile: vi.fn(),
  getXpBaseByPillar: vi.fn(),
  propagateEnergy: vi.fn(),
}));

vi.mock('./user-state-service.js', () => ({
  addDays: serviceMocks.addDays,
  computeDailyTargets: serviceMocks.computeDailyTargets,
  computeDecayRates: serviceMocks.computeDecayRates,
  computeGainFactors: serviceMocks.computeGainFactors,
  computeHalfLife: serviceMocks.computeHalfLife,
  enumerateDates: serviceMocks.enumerateDates,
  formatDateInTimezone: serviceMocks.formatDateInTimezone,
  getDailyXpSeriesByPillar: serviceMocks.getDailyXpSeriesByPillar,
  getUserLogStats: serviceMocks.getUserLogStats,
  getUserProfile: serviceMocks.getUserProfile,
  getXpBaseByPillar: serviceMocks.getXpBaseByPillar,
  propagateEnergy: serviceMocks.propagateEnergy,
}));

describe('getUserState', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('rejects invalid user ids', async () => {
    const { getUserState } = await import('./get-user-state.js');
    const req = mockReq({ params: { id: 'not-a-uuid' } });
    const res = mockRes();

    await expect(getUserState(req, res, vi.fn())).rejects.toThrowError();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns cached state when invoked multiple times', async () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const dates: string[] = ['2024-01-05', '2024-01-10'];

    serviceMocks.getUserProfile.mockResolvedValue({
      userId,
      modeCode: 'FLOW',
      modeName: 'Flow Mode',
      weeklyTarget: 600,
      timezone: 'UTC',
    });
    serviceMocks.getUserLogStats.mockResolvedValue({ uniqueDays: 3, firstDate: '2024-01-01' });
    serviceMocks.getXpBaseByPillar.mockResolvedValue({ Body: 10, Mind: 20, Soul: 30 });
    serviceMocks.computeHalfLife.mockReturnValue({ Body: 2, Mind: 3, Soul: 4 });
    serviceMocks.computeDailyTargets.mockReturnValue({ Body: 4, Mind: 5, Soul: 6 });
    serviceMocks.computeDecayRates.mockReturnValue({
      Body: 0.123456,
      Mind: 0.234567,
      Soul: 0.345678,
    });
    serviceMocks.computeGainFactors.mockReturnValue({
      Body: 1.2,
      Mind: 1.3,
      Soul: 1.4,
    });
    serviceMocks.formatDateInTimezone.mockReturnValue('2024-01-10');
    serviceMocks.enumerateDates.mockReturnValue(dates);
    serviceMocks.addDays.mockReturnValue('2024-01-07');
    serviceMocks.getDailyXpSeriesByPillar.mockResolvedValue(
      new Map<string, Partial<Record<'Body' | 'Mind' | 'Soul', number>>>([
        ['2024-01-10', { Body: 12, Mind: 8, Soul: 4 }],
      ]),
    );
    serviceMocks.propagateEnergy.mockReturnValue({
      lastEnergy: { Body: 91, Mind: 82, Soul: 73 },
      series: [],
    });

    const { getUserState } = await import('./get-user-state.js');
    const req = mockReq({ params: { id: userId } });
    const res = mockRes();
    const next = vi.fn();

    await getUserState(req, res, next);

    expect(serviceMocks.enumerateDates).toHaveBeenCalledWith('2024-01-01', '2024-01-10');
    expect(serviceMocks.getUserProfile).toHaveBeenCalledTimes(1);
    expect(serviceMocks.propagateEnergy).toHaveBeenCalledWith({
      dates,
      xpByDate: expect.any(Map),
      halfLifeByPillar: { Body: 2, Mind: 3, Soul: 4 },
      dailyTargets: { Body: 4, Mind: 5, Soul: 6 },
      forceFullGrace: true,
      graceUntilDate: '2024-01-07',
    });

    const payload = res.json.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      date: '2024-01-10',
      mode: 'FLOW',
      mode_name: 'Flow Mode',
      weekly_target: 600,
      grace: { applied: true, unique_days: 3 },
      pillars: {
        Body: {
          hp: 91,
          xp_today: 12,
          d: Number(0.123456.toFixed(6)),
          k: Number(1.2.toFixed(6)),
          H: 2,
          xp_obj_day: 4,
        },
        Mind: {
          focus: 82,
          xp_today: 8,
          d: Number(0.234567.toFixed(6)),
          k: Number(1.3.toFixed(6)),
          H: 3,
          xp_obj_day: 5,
        },
        Soul: {
          mood: 73,
          xp_today: 4,
          d: Number(0.345678.toFixed(6)),
          k: Number(1.4.toFixed(6)),
          H: 4,
          xp_obj_day: 6,
        },
      },
    });
    expect(next).not.toHaveBeenCalled();

    const resSecond = mockRes();
    await getUserState(req, resSecond, vi.fn());

    expect(serviceMocks.getUserProfile).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getDailyXpSeriesByPillar).toHaveBeenCalledTimes(1);
    expect(resSecond.json).toHaveBeenCalledWith(payload);
  });
});
