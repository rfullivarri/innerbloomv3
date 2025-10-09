import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserState } from './get-user-state.js';

const {
  mockGetUserProfile,
  mockGetUserLogStats,
  mockGetXpBaseByPillar,
  mockComputeHalfLife,
  mockComputeDecayRates,
  mockComputeDailyTargets,
  mockComputeGainFactors,
  mockEnumerateDates,
  mockGetDailyXpSeriesByPillar,
  mockPropagateEnergy,
  mockFormatDateInTimezone,
  mockAddDays,
} = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
  mockGetUserLogStats: vi.fn(),
  mockGetXpBaseByPillar: vi.fn(),
  mockComputeHalfLife: vi.fn(),
  mockComputeDecayRates: vi.fn(),
  mockComputeDailyTargets: vi.fn(),
  mockComputeGainFactors: vi.fn(),
  mockEnumerateDates: vi.fn(),
  mockGetDailyXpSeriesByPillar: vi.fn(),
  mockPropagateEnergy: vi.fn(),
  mockFormatDateInTimezone: vi.fn(),
  mockAddDays: vi.fn(),
}));

vi.mock('./user-state-service.js', () => ({
  getUserProfile: mockGetUserProfile,
  getUserLogStats: mockGetUserLogStats,
  getXpBaseByPillar: mockGetXpBaseByPillar,
  computeHalfLife: mockComputeHalfLife,
  computeDecayRates: mockComputeDecayRates,
  computeDailyTargets: mockComputeDailyTargets,
  computeGainFactors: mockComputeGainFactors,
  enumerateDates: mockEnumerateDates,
  getDailyXpSeriesByPillar: mockGetDailyXpSeriesByPillar,
  propagateEnergy: mockPropagateEnergy,
  formatDateInTimezone: mockFormatDateInTimezone,
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

describe('getUserState', () => {
  beforeEach(() => {
    mockGetUserProfile.mockReset();
    mockGetUserLogStats.mockReset();
    mockGetXpBaseByPillar.mockReset();
    mockComputeHalfLife.mockReset();
    mockComputeDecayRates.mockReset();
    mockComputeDailyTargets.mockReset();
    mockComputeGainFactors.mockReset();
    mockEnumerateDates.mockReset();
    mockGetDailyXpSeriesByPillar.mockReset();
    mockPropagateEnergy.mockReset();
    mockFormatDateInTimezone.mockReset();
    mockAddDays.mockReset();
  });

  it('returns the mode name and code following the profile priority', async () => {
    const req = {
      params: { id: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d' },
    } as unknown as Request;
    const res = createMockResponse();

    mockGetUserProfile.mockResolvedValue({
      userId: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d',
      modeCode: 'FLOW',
      modeName: 'Flow Mode',
      weeklyTarget: 21,
      timezone: 'UTC',
    });
    mockGetUserLogStats.mockResolvedValue({ uniqueDays: 10, firstDate: '2023-12-15' });
    mockGetXpBaseByPillar.mockResolvedValue({ Body: 10, Mind: 20, Soul: 30 });
    mockComputeHalfLife.mockReturnValue({ Body: 2, Mind: 3, Soul: 4 });
    mockComputeDecayRates.mockReturnValue({ Body: 0.1, Mind: 0.2, Soul: 0.3 });
    mockComputeDailyTargets.mockReturnValue({ Body: 1, Mind: 2, Soul: 3 });
    mockComputeGainFactors.mockReturnValue({ Body: 0.5, Mind: 0.4, Soul: 0.3 });
    mockEnumerateDates.mockReturnValue(['2023-12-15', '2023-12-16', '2023-12-17']);
    mockGetDailyXpSeriesByPillar.mockResolvedValue(new Map([['2023-12-16', { Body: 2 }]]));
    mockPropagateEnergy.mockReturnValue({
      lastEnergy: { Body: 95, Mind: 85, Soul: 75 },
      series: [],
    });
    mockFormatDateInTimezone.mockReturnValue('2023-12-22');
    mockAddDays.mockReturnValue('2023-12-21');

    await getUserState(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2023-12-22',
        mode: 'Flow Mode',
        mode_name: 'Flow Mode',
      }),
    );
  });
});
