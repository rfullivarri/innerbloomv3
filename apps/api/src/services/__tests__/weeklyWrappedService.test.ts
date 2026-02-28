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
  it('builds a 7-day window ending on the reference date', () => {
    const referenceDate = '2024-10-14';

    const range = resolveWeekRange(referenceDate);

    expect(range).toEqual({ start: '2024-10-08', end: '2024-10-14' });
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
