import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindWeeklyWrappedByRange } = vi.hoisted(() => ({
  mockFindWeeklyWrappedByRange: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: vi.fn() },
}));

vi.mock('../../repositories/weekly-wrapped.repository.js', () => ({
  findWeeklyWrappedByRange: mockFindWeeklyWrappedByRange,
  findWeeklyWrappedByWeek: vi.fn(),
  insertWeeklyWrapped: vi.fn(),
  listActiveUsersWithLogs: vi.fn(),
  listRecentWeeklyWrapped: vi.fn(),
}));

import { resolveWeekRange, shouldGenerateWeeklyWrappedForSubmission } from '../weeklyWrappedService.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('resolveWeekRange', () => {
  it('builds a 7-day window ending on the reference date', () => {
    const referenceDate = '2024-10-14';

    const range = resolveWeekRange(referenceDate);

    expect(range).toEqual({ start: '2024-10-08', end: '2024-10-14' });
  });
});

describe('shouldGenerateWeeklyWrappedForSubmission', () => {
  beforeEach(() => {
    mockFindWeeklyWrappedByRange.mockReset();
  });

  it('triggers generation on the first submission of the week (Monday)', async () => {
    const referenceDate = '2024-10-14';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-08', '2024-10-14');
  });

  it('triggers generation on the first submission even if Monday was not logged', async () => {
    const referenceDate = '2024-10-15';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-09', '2024-10-15');
  });

  it('does not regenerate within the same week when a submission already exists', async () => {
    const referenceDate = '2024-10-16';
    mockFindWeeklyWrappedByRange.mockResolvedValue({ id: 'wrapped-1' });

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(false);
  });
});
