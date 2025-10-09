import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserTasks } from './get-user-tasks.js';

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

function createResponse(): Response {
  const json = vi.fn();

  return {
    json,
  } as unknown as Response;
}

describe('getUserTasks', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEnsureUserExists.mockReset();
  });

  it('returns active tasks using the provided pagination params', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          task_id: 'task-1',
          task: 'Do something',
          pillar_id: 'pillar-1',
          trait_id: 'trait-2',
          difficulty_id: 'diff-3',
          xp_base: '12',
          active: true,
        },
      ],
    });

    const req = {
      params: { id: '28aa2aef-4f36-4b29-9ba7-8bbcb8aff0ef' },
      query: { limit: '10', offset: '5' },
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    await getUserTasks(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM tasks t'),
      ['28aa2aef-4f36-4b29-9ba7-8bbcb8aff0ef', 10, 5],
    );
    expect(res.json).toHaveBeenCalledWith({
      limit: 10,
      offset: 5,
      tasks: [
        {
          task_id: 'task-1',
          task: 'Do something',
          pillar_id: 'pillar-1',
          trait_id: 'trait-2',
          difficulty_id: 'diff-3',
          xp_base: 12,
          active: true,
        },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses default pagination when params are omitted', async () => {
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const req = {
      params: { id: 'd2ab2abe-83c8-4a72-9c09-373485d1fa9a' },
      query: {},
    } as unknown as Request;
    const res = createResponse();

    await getUserTasks(req, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM tasks t'),
      ['d2ab2abe-83c8-4a72-9c09-373485d1fa9a', 50, 0],
    );
    expect(res.json).toHaveBeenCalledWith({ limit: 50, offset: 0, tasks: [] });
  });
});
