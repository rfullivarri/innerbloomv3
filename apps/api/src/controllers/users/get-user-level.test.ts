import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserLevel } from './get-user-level.js';

const { mockQuery, mockEnsureUserExists, mockBuildLevelSummary } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
  mockBuildLevelSummary: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock('./shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('./level-summary.js', () => ({
  buildLevelSummary: mockBuildLevelSummary,
}));

function createResponse(): Response {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserLevel', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    mockBuildLevelSummary.mockReset();
  });

  it('returns the computed level summary for the requested user', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ xp_total: '150' }] })
      .mockResolvedValueOnce({
        rows: [
          { level: '0', xp_required: '0' },
          { level: '1', xp_required: '100' },
          { level: '2', xp_required: '250' },
        ],
      });
    mockBuildLevelSummary.mockReturnValue({
      currentLevel: 2,
      xpRequiredCurrent: 100,
      xpRequiredNext: 300,
      xpToNext: 150,
      progressPercent: 60,
    });

    const req = {
      params: { id: '2abfdf50-ecf0-4f94-8cb7-2b3429792433' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserLevel(req, res, next);

    expect(mockEnsureUserExists).toHaveBeenCalledWith('2abfdf50-ecf0-4f94-8cb7-2b3429792433');
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM v_user_total_xp'),
      ['2abfdf50-ecf0-4f94-8cb7-2b3429792433'],
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM v_user_level'),
      ['2abfdf50-ecf0-4f94-8cb7-2b3429792433'],
    );
    expect(mockBuildLevelSummary).toHaveBeenCalledWith(150, [
      { level: 0, xpRequired: 0 },
      { level: 1, xpRequired: 100 },
      { level: 2, xpRequired: 250 },
    ]);
    expect(res.json).toHaveBeenCalledWith({
      user_id: '2abfdf50-ecf0-4f94-8cb7-2b3429792433',
      current_level: 2,
      xp_total: 150,
      xp_required_current: 100,
      xp_required_next: 300,
      xp_to_next: 150,
      progress_percent: 60,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('normalizes invalid XP totals and thresholds before building the summary', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ xp_total: '-12' }] })
      .mockResolvedValueOnce({
        rows: [
          { level: '3', xp_required: '450' },
          { level: null, xp_required: null },
        ],
      });

    mockBuildLevelSummary.mockReturnValue({
      currentLevel: 0,
      xpRequiredCurrent: 0,
      xpRequiredNext: 450,
      xpToNext: 450,
      progressPercent: 0,
    });

    const req = {
      params: { id: 'b77fcdaa-8d96-4a68-ac07-f21a8193c116' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserLevel(req, res, next);

    expect(mockBuildLevelSummary).toHaveBeenCalledWith(0, [
      { level: 3, xpRequired: 450 },
      { level: 0, xpRequired: 0 },
    ]);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'b77fcdaa-8d96-4a68-ac07-f21a8193c116',
      current_level: 0,
      xp_total: 0,
      xp_required_current: 0,
      xp_required_next: 450,
      xp_to_next: 450,
      progress_percent: 0,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
