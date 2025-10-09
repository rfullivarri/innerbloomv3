import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockReq, mockRes } from '../../tests/test-utils.js';

const { ensureUserExistsMock, poolQueryMock } = vi.hoisted(() => ({
  ensureUserExistsMock: vi.fn(),
  poolQueryMock: vi.fn(),
}));

vi.mock('../../controllers/users/shared.js', () => ({
  ensureUserExists: ensureUserExistsMock,
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: poolQueryMock,
  },
}));

describe('getUserStreakPanel', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SHOW_STREAKS_PANEL;
  });

  it('returns 404 when the streak panel feature flag is disabled', async () => {
    process.env.SHOW_STREAKS_PANEL = 'false';
    const { getUserStreakPanel } = await import('./streak-panel.js');
    const req = mockReq({
      params: { id: '11111111-2222-3333-4444-555555555555' },
      query: { pillar: 'Body', range: 'week' },
    });
    const res = mockRes();

    await getUserStreakPanel(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'streak_panel_disabled' });
    expect(ensureUserExistsMock).not.toHaveBeenCalled();
    expect(poolQueryMock).not.toHaveBeenCalled();
  });

  it('throws when the user id is invalid', async () => {
    const { getUserStreakPanel } = await import('./streak-panel.js');
    const req = mockReq({
      params: { id: 'not-a-uuid' },
      query: { pillar: 'Body', range: 'week' },
    });
    const res = mockRes();

    await expect(getUserStreakPanel(req, res, vi.fn())).rejects.toThrowError();
    expect(res.json).not.toHaveBeenCalled();
    expect(poolQueryMock).not.toHaveBeenCalled();
  });

  it('returns streak metrics for the requested pillar', async () => {
    ensureUserExistsMock.mockResolvedValue(undefined);
    poolQueryMock
      .mockResolvedValueOnce({ rows: [{ timezone: 'UTC', today: '2024-01-07' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            task_id: 'task-1',
            task: 'Push Ups',
            xp_base: '10',
            trait_name: 'Strength',
            trait_code: 'STR',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { task_id: 'task-1', date: '2024-01-01', count: '2' },
          { task_id: 'task-1', date: '2024-01-08', count: '1' },
        ],
      });

    const { getUserStreakPanel } = await import('./streak-panel.js');
    const req = mockReq({
      params: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
      query: { pillar: 'Body', range: 'week' },
    });
    const res = mockRes();

    await getUserStreakPanel(req, res, vi.fn());

    expect(ensureUserExistsMock).toHaveBeenCalledWith('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(poolQueryMock).toHaveBeenCalledTimes(3);

    const payload = res.json.mock.calls[0]?.[0];
    expect(payload?.tasks).toHaveLength(1);
    expect(payload?.tasks?.[0]).toMatchObject({
      id: 'task-1',
      name: 'Push Ups',
      stat: 'Strength',
      metrics: {
        week: {
          count: expect.any(Number),
          xp: expect.any(Number),
        },
        month: expect.objectContaining({ count: expect.any(Number) }),
        qtr: expect.objectContaining({ count: expect.any(Number) }),
      },
    });
    expect(payload?.topStreaks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'task-1', name: 'Push Ups' }),
      ]),
    );
  });
});
