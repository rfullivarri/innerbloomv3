import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { formatAsDateString, resolveDateRange } from '../../lib/validation.js';
import { getUserEmotions } from './get-user-emotions.js';

const { mockQuery, mockEnsureUserExists } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock('../users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

function createMockResponse() {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserEmotions', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the normalized range and emotion days data', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [
        { date: '2024-05-31', emotion: 'CALM' },
        { date: '2024-05-30', emotion: null },
      ],
    });

    const req = {
      params: { id: '9a8f84f4-230b-4316-9b77-7d5a87ecec34' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();
    const next = vi.fn();

    await getUserEmotions(req, res, next);

    const expectedRange = resolveDateRange({}, 90);

    expect(mockEnsureUserExists).toHaveBeenCalledWith('9a8f84f4-230b-4316-9b77-7d5a87ecec34');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('JOIN cat_emotion'),
      [
        '9a8f84f4-230b-4316-9b77-7d5a87ecec34',
        formatAsDateString(expectedRange.from),
        formatAsDateString(expectedRange.to),
      ],
    );
    expect(res.json).toHaveBeenCalledWith({
      user_id: '9a8f84f4-230b-4316-9b77-7d5a87ecec34',
      range: {
        from: formatAsDateString(expectedRange.from),
        to: formatAsDateString(expectedRange.to),
      },
      days: [
        { date: '2024-05-31', emotion: 'CALM', intensity: null },
        { date: '2024-05-30', emotion: null, intensity: null },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an empty days array when no rows are found', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: '9a8f84f4-230b-4316-9b77-7d5a87ecec34' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();
    const next = vi.fn();

    await getUserEmotions(req, res, next);

    const expectedRange = resolveDateRange({}, 90);

    expect(res.json).toHaveBeenCalledWith({
      user_id: '9a8f84f4-230b-4316-9b77-7d5a87ecec34',
      range: {
        from: formatAsDateString(expectedRange.from),
        to: formatAsDateString(expectedRange.to),
      },
      days: [],
    });
    expect(next).not.toHaveBeenCalled();
  });
});
