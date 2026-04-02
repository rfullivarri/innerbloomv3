import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyWrappedRecord } from '../../lib/api';

vi.mock('../../lib/api', () => {
  const getWeeklyWrappedLatest = vi.fn();
  const getWeeklyWrappedPrevious = vi.fn();
  const getWeeklyWrappedPending = vi.fn();
  const markWeeklyWrappedSeen = vi.fn();
  return { getWeeklyWrappedLatest, getWeeklyWrappedPrevious, getWeeklyWrappedPending, markWeeklyWrappedSeen };
});

const api = await import('../../lib/api');
const getWeeklyWrappedLatest = vi.mocked(api.getWeeklyWrappedLatest);
const getWeeklyWrappedPrevious = vi.mocked(api.getWeeklyWrappedPrevious);
const getWeeklyWrappedPending = vi.mocked(api.getWeeklyWrappedPending);
const markWeeklyWrappedSeen = vi.mocked(api.markWeeklyWrappedSeen);
const { useWeeklyWrapped } = await import('../useWeeklyWrapped');

describe('useWeeklyWrapped', () => {
  beforeEach(() => {
    getWeeklyWrappedLatest.mockReset();
    getWeeklyWrappedPrevious.mockReset();
    getWeeklyWrappedPending.mockReset();
    markWeeklyWrappedSeen.mockReset();

    getWeeklyWrappedLatest.mockResolvedValue(null);
    getWeeklyWrappedPrevious.mockResolvedValue(null);
    getWeeklyWrappedPending.mockResolvedValue({ item: null, unseenCount: 0 });
    markWeeklyWrappedSeen.mockResolvedValue({ seenAt: '2026-04-02T00:00:00.000Z', unseenCount: 0 });
  });

  it('auto-opens when pending wrap exists', async () => {
    getWeeklyWrappedPending.mockResolvedValueOnce({
      item: {
        id: 'wrap-1',
        userId: 'user-1',
        weekStart: '2026-03-23',
        weekEnd: '2026-03-29',
        payload: { variant: 'light' },
        createdAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:00:00.000Z',
      } as unknown as WeeklyWrappedRecord,
      unseenCount: 1,
    });

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.activeRecord?.id).toBe('wrap-1');
    expect(result.current.unseenCount).toBe(1);
  });

  it('closing without completion does not mark as seen', async () => {
    getWeeklyWrappedPending.mockResolvedValueOnce({
      item: {
        id: 'wrap-1', userId: 'user-1', weekStart: '2026-03-23', weekEnd: '2026-03-29', payload: { variant: 'light' }, createdAt: '2026-03-30T10:00:00.000Z', updatedAt: '2026-03-30T10:00:00.000Z',
      } as unknown as WeeklyWrappedRecord,
      unseenCount: 1,
    });

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => {
      result.current.closeModal();
    });

    expect(markWeeklyWrappedSeen).not.toHaveBeenCalled();
    expect(result.current.isModalOpen).toBe(false);
  });

  it('marks seen only on final completion', async () => {
    getWeeklyWrappedPending
      .mockResolvedValueOnce({
        item: {
          id: 'wrap-1', userId: 'user-1', weekStart: '2026-03-23', weekEnd: '2026-03-29', payload: { variant: 'light' }, createdAt: '2026-03-30T10:00:00.000Z', updatedAt: '2026-03-30T10:00:00.000Z',
        } as unknown as WeeklyWrappedRecord,
        unseenCount: 1,
      })
      .mockResolvedValueOnce({ item: null, unseenCount: 0 });

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      await result.current.completeModal();
    });

    expect(markWeeklyWrappedSeen).toHaveBeenCalledWith('user-1', 'wrap-1');
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.unseenCount).toBe(0);
  });
});
