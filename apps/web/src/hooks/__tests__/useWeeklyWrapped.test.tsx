import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyWrappedRecord } from '../../lib/api';

vi.mock('../../lib/api', () => {
  const getWeeklyWrappedLatest = vi.fn();
  const getWeeklyWrappedPrevious = vi.fn();
  return { getWeeklyWrappedLatest, getWeeklyWrappedPrevious };
});

const api = await import('../../lib/api');
const getWeeklyWrappedLatest = vi.mocked(api.getWeeklyWrappedLatest);
const getWeeklyWrappedPrevious = vi.mocked(api.getWeeklyWrappedPrevious);
const { useWeeklyWrapped } = await import('../useWeeklyWrapped');

describe('useWeeklyWrapped', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-05-09T12:00:00Z'));
    getWeeklyWrappedLatest.mockReset();
    getWeeklyWrappedPrevious.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the modal after the first submission of the week regardless of the day', async () => {
    getWeeklyWrappedLatest.mockResolvedValueOnce({
      id: 'wrap-1',
      userId: 'user-1',
      weekStart: '2024-05-06',
      weekEnd: '2024-05-07',
      payload: { variant: 'light' },
      summary: null,
      createdAt: '2024-05-07T10:00:00.000Z',
      updatedAt: '2024-05-07T10:00:00.000Z',
    } as unknown as WeeklyWrappedRecord);
    getWeeklyWrappedPrevious.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.activeRecord?.id).toBe('wrap-1');
    expect(window.localStorage.getItem('weekly-wrapped-seen:2024-05-06')).toBe('true');
  });

  it('does not reopen the modal again during the same week once it was shown', async () => {
    getWeeklyWrappedLatest.mockResolvedValue({
      id: 'wrap-1',
      userId: 'user-1',
      weekStart: '2024-05-06',
      weekEnd: '2024-05-07',
      payload: { variant: 'light' },
      summary: null,
      createdAt: '2024-05-07T10:00:00.000Z',
      updatedAt: '2024-05-07T10:00:00.000Z',
    } as unknown as WeeklyWrappedRecord);
    getWeeklyWrappedPrevious.mockResolvedValue(null);

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => {
      result.current.closeModal();
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.isModalOpen).toBe(false);
  });

  it('shows the modal again on the first submission of a new week with the new window', async () => {
    getWeeklyWrappedLatest
      .mockResolvedValueOnce({
        id: 'wrap-1',
        userId: 'user-1',
        weekStart: '2024-05-06',
        weekEnd: '2024-05-07',
        payload: { variant: 'light' },
        summary: null,
        createdAt: '2024-05-07T10:00:00.000Z',
        updatedAt: '2024-05-07T10:00:00.000Z',
      } as unknown as WeeklyWrappedRecord)
      .mockResolvedValueOnce({
        id: 'wrap-2',
        userId: 'user-1',
        weekStart: '2024-05-13',
        weekEnd: '2024-05-13',
        payload: { variant: 'light' },
        summary: null,
        createdAt: '2024-05-13T10:00:00.000Z',
        updatedAt: '2024-05-13T10:00:00.000Z',
      } as unknown as WeeklyWrappedRecord);
    getWeeklyWrappedPrevious.mockResolvedValue(null);

    const { result } = renderHook(() => useWeeklyWrapped('user-1'));

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.isModalOpen).toBe(true);
    act(() => {
      result.current.closeModal();
    });

    act(() => {
      vi.setSystemTime(new Date('2024-05-13T12:00:00Z'));
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.isModalOpen).toBe(true);
    expect(result.current.activeRecord?.id).toBe('wrap-2');
    expect(window.localStorage.getItem('weekly-wrapped-seen:2024-05-13')).toBe('true');
  });
});
