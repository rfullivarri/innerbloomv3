import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
}));

import { findPendingWeeklyWrappedId, markWeeklyWrappedSeen } from '../weeklyWrappedViewsService.js';

describe('weeklyWrappedViewsService', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('marks seen and returns inserted timestamp', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ seen_at: '2026-04-01T10:00:00.000Z' }] });

    const seenAt = await markWeeklyWrappedSeen('11111111-2222-3333-4444-555555555555', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(seenAt).toBe('2026-04-01T10:00:00.000Z');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (user_id, weekly_wrapped_id)'), expect.any(Array));
  });

  it('is idempotent and returns existing timestamp when row already exists', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ seen_at: '2026-04-01T09:00:00.000Z' }] });

    const seenAt = await markWeeklyWrappedSeen('11111111-2222-3333-4444-555555555555', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');

    expect(seenAt).toBe('2026-04-01T09:00:00.000Z');
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('limits auto-open pending selection to a recent lookback window', async () => {
    mockQuery
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ weekly_wrapped_id: 'recent-pending' }] });

    const pendingId = await findPendingWeeklyWrappedId(
      '11111111-2222-3333-4444-555555555555',
      { now: new Date('2026-04-02T00:00:00.000Z'), autoOpenLookbackDays: 21 },
    );

    expect(pendingId).toBe('recent-pending');
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining("ww.week_end >= ($2::timestamptz - make_interval(days => $3))::date"),
      ['11111111-2222-3333-4444-555555555555', '2026-04-02T00:00:00.000Z', 21],
    );
  });
});
