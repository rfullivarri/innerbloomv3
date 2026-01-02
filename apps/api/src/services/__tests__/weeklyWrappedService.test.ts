import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockFindWeeklyWrappedByRange } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockFindWeeklyWrappedByRange: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
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
    mockQuery.mockReset();
    mockFindWeeklyWrappedByRange.mockReset();
  });

  it('triggers generation on the first submission of the week (Monday)', async () => {
    const referenceDate = '2024-10-14';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-08', '2024-10-14');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [userId, '2024-10-08', '2024-10-14', referenceDate],
    );
  });

  it('triggers generation on the first submission even if Monday was not logged', async () => {
    const referenceDate = '2024-10-15';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-09', '2024-10-15');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [userId, '2024-10-09', '2024-10-15', referenceDate],
    );
  });

  it('does not regenerate within the same week when a submission already exists', async () => {
    const referenceDate = '2024-10-16';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);
    mockQuery.mockResolvedValue({ rows: [{ count: '2' }] });

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(false);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [userId, '2024-10-10', '2024-10-16', referenceDate],
    );
  });
});
