import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserStreakPanel } from './streak-panel.js';

const { mockQuery, mockEnsureUserExists } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnsureUserExists: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

vi.mock('../../controllers/users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

function createMockResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();

  return {
    json,
    status,
  } as unknown as Response;
}

describe('getUserStreakPanel', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
    process.env.SHOW_STREAKS_PANEL = 'true';
  });

  it('builds streak summaries including top streaks for the requested pillar', async () => {
    const req = {
      params: { id: '4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d' },
      query: { pillar: 'Body', range: 'month', mode: 'flow' },
    } as unknown as Request;
    const res = createMockResponse();

    mockEnsureUserExists.mockResolvedValue(undefined);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC', today: '2024-01-29' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            task: 'Push Ups',
            xp_base: '5',
            trait_name: 'Strength',
            trait_code: 'STR',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { task_id: 'task-1', date: '2024-01-01', count: '3' },
          { task_id: 'task-1', date: '2024-01-08', count: '3' },
          { task_id: 'task-1', date: '2024-01-15', count: '3' },
          { task_id: 'task-1', date: '2024-01-22', count: '3' },
        ],
      });

    await getUserStreakPanel(req, res, vi.fn());

    expect(mockEnsureUserExists).toHaveBeenCalledWith('4a6f8b1e-12f0-4a22-8e8a-7cbf8250a49d');
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        topStreaks: expect.arrayContaining([
          expect.objectContaining({ id: 'task-1', name: 'Push Ups' }),
        ]),
      }),
    );
  });
});
