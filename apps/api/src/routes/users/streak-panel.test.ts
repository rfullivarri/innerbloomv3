import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnsureUserExists, mockPoolQuery } = vi.hoisted(() => ({
  mockEnsureUserExists: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock('../../controllers/users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
}));

function createResponse() {
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();

  return { status, json } as unknown as Response;
}

describe('getUserStreakPanel', () => {
  beforeEach(() => {
    mockEnsureUserExists.mockReset();
    mockPoolQuery.mockReset();
  });

  it('returns 404 when the panel feature is disabled', async () => {
    process.env.SHOW_STREAKS_PANEL = 'false';
    const { getUserStreakPanel } = await import('./streak-panel.js?disabled');

    const req = {
      params: { id: '2ad1ec2f-51cb-4633-8040-5e5cbb2f5d71' },
      query: { pillar: 'Body', range: 'week' },
    } as unknown as Request;
    const res = createResponse();

    await getUserStreakPanel(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'streak_panel_disabled' });
  });

  it('computes streak metrics for the requested pillar', async () => {
    process.env.SHOW_STREAKS_PANEL = 'true';
    const { getUserStreakPanel } = await import('./streak-panel.js?enabled');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ timezone: 'UTC', today: '2024-05-13' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            task: 'Morning Run',
            xp_base: '10',
            trait_name: 'Endurance',
            trait_code: 'END',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { task_id: 'task-1', date: '2024-05-13', count: '2' },
          { task_id: 'task-1', date: '2024-05-06', count: '1' },
        ],
      });

    const req = {
      params: { id: '2ad1ec2f-51cb-4633-8040-5e5cbb2f5d71' },
      query: { pillar: 'Body', range: 'month', mode: 'low', query: 'run' },
    } as unknown as Request;
    const res = createResponse();

    await getUserStreakPanel(req, res, vi.fn());

    expect(mockEnsureUserExists).toHaveBeenCalledWith('2ad1ec2f-51cb-4633-8040-5e5cbb2f5d71');
    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            id: 'task-1',
            name: 'Morning Run',
            streakWeeks: expect.any(Number),
            metrics: expect.objectContaining({
              week: expect.any(Object),
              month: expect.any(Object),
              qtr: expect.any(Object),
            }),
          }),
        ]),
      }),
    );
  });

  it('returns an empty payload when no tasks match the search query', async () => {
    process.env.SHOW_STREAKS_PANEL = 'true';
    const { getUserStreakPanel } = await import('./streak-panel.js?filtered');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC', today: '2024-05-13' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            task: 'Morning Run',
            xp_base: '10',
            trait_name: 'Endurance',
            trait_code: 'END',
          },
        ],
      });

    const req = {
      params: { id: '2ad1ec2f-51cb-4633-8040-5e5cbb2f5d71' },
      query: { pillar: 'Body', range: 'week', mode: 'flow', query: 'nothing' },
    } as unknown as Request;
    const res = createResponse();

    await getUserStreakPanel(req, res, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({ topStreaks: [], tasks: [] });
  });

  it('normalizes modes, filters by accent-insensitive queries and surfaces top streaks', async () => {
    process.env.SHOW_STREAKS_PANEL = 'true';
    process.env.DEBUG_STREAKS_PANEL = 'true';
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { getUserStreakPanel } = await import('./streak-panel.js?branches');

    mockEnsureUserExists.mockResolvedValue(undefined);
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ timezone: null, today: 'May 13, 2024' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-run',
            task: 'Rutína Aeróbica',
            xp_base: '12',
            trait_name: 'Salud Física',
            trait_code: 'salud_fisica_total',
          },
          {
            task_id: 'task-read',
            task: 'Lectura Chill',
            xp_base: 8,
            trait_name: 'Intelecto',
            trait_code: 'INT',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { task_id: 'task-run', date: '2024-05-13', count: '4' },
          { task_id: 'task-run', date: '2024-05-06', count: '5' },
          { task_id: 'task-run', date: '2024-04-29', count: '6' },
          { task_id: 'task-run', date: '2024-04-22', count: '1' },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ timezone: 'America/Bogota', today: null }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-breath',
            task: 'Respiración Guiada',
            xp_base: null,
            trait_name: null,
            trait_code: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const firstReq = {
      params: { id: '546763a4-35fd-41cc-88e5-3ce51925c5f5' },
      query: { pillar: 'Mind', range: 'qtr', mode: 'EVOL', query: 'rutina' },
    } as unknown as Request;
    const firstRes = createResponse();

    await getUserStreakPanel(firstReq, firstRes, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
    expect(firstRes.json).toHaveBeenCalledTimes(1);
    const firstPayload = firstRes.json.mock.calls[0]?.[0];
    expect(firstPayload?.tasks).toHaveLength(1);
    expect(firstPayload?.tasks?.[0]?.metrics.week.count).toBe(4);
    expect(firstPayload?.tasks?.[0]?.metrics.qtr.weeks).toEqual(expect.arrayContaining([expect.any(Number)]));
    expect(firstPayload?.topStreaks?.[0]).toMatchObject({ id: 'task-run' });
    expect(firstPayload?.topStreaks?.[0]?.streakWeeks).toBeGreaterThanOrEqual(2);
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      '[streak-panel] payload',
      expect.objectContaining({
        mode: 'Evolve',
        pillar: 'Mind',
        query: 'rutina',
        topStreaks: 1,
      }),
    );

    const secondReq = {
      params: { id: '546763a4-35fd-41cc-88e5-3ce51925c5f5' },
      query: { pillar: 'Mind', range: 'week' },
    } as unknown as Request;
    const secondRes = createResponse();

    await getUserStreakPanel(secondReq, secondRes, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledTimes(6);
    const secondPayload = secondRes.json.mock.calls[0]?.[0];
    expect(secondPayload?.tasks?.[0]?.name).toBe('Respiración Guiada');
    expect(secondPayload?.tasks?.[0]?.metrics.week.xp).toBe(0);
    expect(secondPayload?.tasks?.[0]?.metrics.week.count).toBe(0);
    expect(secondPayload?.topStreaks).toEqual([]);

    consoleInfoSpy.mockRestore();
    delete process.env.DEBUG_STREAKS_PANEL;
    delete process.env.SHOW_STREAKS_PANEL;
  });
});
