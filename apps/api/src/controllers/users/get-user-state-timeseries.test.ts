import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../../lib/http-error.js';
import { getUserStateTimeseries } from './get-user-state-timeseries.js';

const {
  mockGetUserProfile,
  mockGetUserLogStats,
  mockGetXpBaseByPillar,
  mockComputeHalfLife,
  mockComputeDailyTargets,
  mockPropagateEnergy,
  mockEnumerateDates,
  mockGetDailyXpSeriesByPillar,
  mockAddDays,
} = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
  mockGetUserLogStats: vi.fn(),
  mockGetXpBaseByPillar: vi.fn(),
  mockComputeHalfLife: vi.fn(),
  mockComputeDailyTargets: vi.fn(),
  mockPropagateEnergy: vi.fn(),
  mockEnumerateDates: vi.fn(),
  mockGetDailyXpSeriesByPillar: vi.fn(),
  mockAddDays: vi.fn(),
}));

vi.mock('./user-state-service.js', () => ({
  getUserProfile: mockGetUserProfile,
  getUserLogStats: mockGetUserLogStats,
  getXpBaseByPillar: mockGetXpBaseByPillar,
  computeHalfLife: mockComputeHalfLife,
  computeDailyTargets: mockComputeDailyTargets,
  propagateEnergy: mockPropagateEnergy,
  enumerateDates: mockEnumerateDates,
  getDailyXpSeriesByPillar: mockGetDailyXpSeriesByPillar,
  addDays: mockAddDays,
}));

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();

  return {
    json,
    status,
  } as unknown as Response;
}

describe('getUserStateTimeseries', () => {
  beforeEach(() => {
    mockGetUserProfile.mockReset();
    mockGetUserLogStats.mockReset();
    mockGetXpBaseByPillar.mockReset();
    mockComputeHalfLife.mockReset();
    mockComputeDailyTargets.mockReset();
    mockPropagateEnergy.mockReset();
    mockEnumerateDates.mockReset();
    mockGetDailyXpSeriesByPillar.mockReset();
    mockAddDays.mockReset();
  });

  it('throws an HttpError when the provided range is invalid', async () => {
    const req = {
      params: { id: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d' },
      query: { from: '2023-12-22', to: '2023-12-20' },
    } as unknown as Request;

    await expect(getUserStateTimeseries(req, createMockResponse(), vi.fn())).rejects.toBeInstanceOf(HttpError);
  });

  it('propagates energy using deterministic dates and returns the filtered series', async () => {
    const req = {
      params: { id: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d' },
      query: { from: '2023-12-20', to: '2023-12-22' },
    } as unknown as Request;
    const res = createMockResponse();

    mockGetUserProfile.mockResolvedValue({
      modeCode: 'FLOW',
      modeName: 'Flow Mode',
      weeklyTarget: 21,
      timezone: 'UTC',
    });
    mockGetUserLogStats.mockResolvedValue({ uniqueDays: 10, firstDate: '2023-12-15' });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 10, Mind: 20, Soul: 30 });
    mockComputeHalfLife.mockReturnValue({ Body: 2, Mind: 3, Soul: 4 });
    mockComputeDailyTargets.mockReturnValue({ Body: 1, Mind: 2, Soul: 3 });
    mockAddDays.mockReturnValue('2023-12-21');

    const enumeratedDates = [
      '2023-12-15',
      '2023-12-16',
      '2023-12-17',
      '2023-12-18',
      '2023-12-19',
      '2023-12-20',
      '2023-12-21',
      '2023-12-22',
    ];
    mockEnumerateDates.mockReturnValue(enumeratedDates);

    const xpSeries = new Map<string, Partial<Record<'Body' | 'Mind' | 'Soul', number>>>([
      ['2023-12-20', { Body: 5 }],
      ['2023-12-21', { Mind: 3 }],
    ]);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(xpSeries);

    mockPropagateEnergy.mockReturnValue({
      series: [
        { date: '2023-12-15', Body: 70, Mind: 60, Soul: 50 },
        { date: '2023-12-20', Body: 80, Mind: 75, Soul: 70 },
        { date: '2023-12-21', Body: 82, Mind: 76, Soul: 71 },
        { date: '2023-12-22', Body: 84, Mind: 77, Soul: 72 },
      ],
      lastEnergy: { Body: 84, Mind: 77, Soul: 72 },
    });

    await getUserStateTimeseries(req, res, vi.fn());

    expect(mockEnumerateDates).toHaveBeenCalledWith('2023-12-15', '2023-12-22');
    expect(mockPropagateEnergy).toHaveBeenCalledWith(
      expect.objectContaining({
        dates: enumeratedDates,
        xpByDate: expect.any(Map),
        dailyTargets: { Body: 1, Mind: 2, Soul: 3 },
        halfLifeByPillar: { Body: 2, Mind: 3, Soul: 4 },
        graceUntilDate: '2023-12-21',
        forceFullGrace: false,
      }),
    );
    expect(res.json).toHaveBeenCalledWith([
      { date: '2023-12-20', Body: 80, Mind: 75, Soul: 70 },
      { date: '2023-12-21', Body: 82, Mind: 76, Soul: 71 },
      { date: '2023-12-22', Body: 84, Mind: 77, Soul: 72 },
    ]);
  });
});
