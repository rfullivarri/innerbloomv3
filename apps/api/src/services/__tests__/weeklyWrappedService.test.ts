import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindWeeklyWrappedByRange, mockPoolQuery } = vi.hoisted(() => ({
  mockFindWeeklyWrappedByRange: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockPoolQuery },
}));

vi.mock('../../repositories/weekly-wrapped.repository.js', () => ({
  findWeeklyWrappedByRange: mockFindWeeklyWrappedByRange,
  findWeeklyWrappedByWeek: vi.fn(),
  insertWeeklyWrapped: vi.fn(),
  listActiveUsersWithLogs: vi.fn(),
  listRecentWeeklyWrapped: vi.fn(),
}));

import {
  isWeeklyWrappedEligibleForSubmission,
  resolveWeekRange,
  shouldGenerateWeeklyWrappedForSubmission,
} from '../weeklyWrappedService.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('resolveWeekRange', () => {
  it('returns the previous closed calendar week (Mon-Sun) for a Monday reference', () => {
    const referenceDate = '2024-10-14'; // Monday

    const range = resolveWeekRange(referenceDate);

    expect(range).toEqual({ start: '2024-10-07', end: '2024-10-13' });
  });

  it('returns the same previous closed week for any day in the current week', () => {
    expect(resolveWeekRange('2024-10-16')).toEqual({ start: '2024-10-07', end: '2024-10-13' }); // Wednesday
    expect(resolveWeekRange('2024-10-17')).toEqual({ start: '2024-10-07', end: '2024-10-13' }); // Thursday
  });
});

describe('isWeeklyWrappedEligibleForSubmission', () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
  });

  it('returns false when first_tasks_confirmed is false', async () => {
    mockPoolQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ first_tasks_confirmed: false, first_tasks_confirmed_at: null }],
    });

    const eligible = await isWeeklyWrappedEligibleForSubmission(userId, '2024-10-14');

    expect(eligible).toBe(false);
  });

  it('returns false when first_tasks_confirmed is true but fewer than 7 days have passed', async () => {
    mockPoolQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ first_tasks_confirmed: true, first_tasks_confirmed_at: '2024-10-10T09:00:00Z' }],
    });

    const eligible = await isWeeklyWrappedEligibleForSubmission(userId, '2024-10-14');

    expect(eligible).toBe(false);
  });

  it('returns true when 7 or more days have passed since first_tasks_confirmed_at', async () => {
    mockPoolQuery.mockResolvedValue({
      rowCount: 1,
      rows: [{ first_tasks_confirmed: true, first_tasks_confirmed_at: '2024-10-07T15:30:00Z' }],
    });

    const eligible = await isWeeklyWrappedEligibleForSubmission(userId, '2024-10-14');

    expect(eligible).toBe(true);
  });
});

describe('shouldGenerateWeeklyWrappedForSubmission', () => {
  beforeEach(() => {
    mockFindWeeklyWrappedByRange.mockReset();
  });

  it('generates on Monday using the previous closed week range', async () => {
    const referenceDate = '2024-10-14';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-07', '2024-10-13');
  });

  it('generates the same range on Wednesday when Monday/Tuesday were missed', async () => {
    const referenceDate = '2024-10-16';
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(true);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-07', '2024-10-13');
  });

  it('does not regenerate on Thursday when the same week range already exists', async () => {
    const referenceDate = '2024-10-17';
    mockFindWeeklyWrappedByRange.mockResolvedValue({ id: 'wrapped-1' });

    const shouldGenerate = await shouldGenerateWeeklyWrappedForSubmission(userId, referenceDate);

    expect(shouldGenerate).toBe(false);
    expect(mockFindWeeklyWrappedByRange).toHaveBeenCalledWith(userId, '2024-10-07', '2024-10-13');
  });

  it('keeps the same previous-week range through the end of the current week', async () => {
    mockFindWeeklyWrappedByRange.mockResolvedValue(null);

    await shouldGenerateWeeklyWrappedForSubmission(userId, '2024-10-18'); // Saturday
    await shouldGenerateWeeklyWrappedForSubmission(userId, '2024-10-20'); // Sunday

    expect(mockFindWeeklyWrappedByRange).toHaveBeenNthCalledWith(
      1,
      userId,
      '2024-10-07',
      '2024-10-13',
    );
    expect(mockFindWeeklyWrappedByRange).toHaveBeenNthCalledWith(
      2,
      userId,
      '2024-10-07',
      '2024-10-13',
    );
  });
});
