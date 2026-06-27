import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateRequestCache, useRequest } from '../useRequest';

describe('useRequest cache', () => {
  beforeEach(() => {
    invalidateRequestCache();
    vi.restoreAllMocks();
  });

  it('deduplicates simultaneous requests with the same cache key', async () => {
    const factory = vi.fn<() => Promise<{ ok: boolean }>>(
      () => new Promise((resolve) => window.setTimeout(() => resolve({ ok: true }), 0)),
    );

    const first = renderHook(() => useRequest(factory, [], {
      cacheKey: 'shared-request',
      staleMs: 60_000,
    }));
    const second = renderHook(() => useRequest(factory, [], {
      cacheKey: 'shared-request',
      staleMs: 60_000,
    }));

    await waitFor(() => {
      expect(first.result.current.status).toBe('success');
      expect(second.result.current.status).toBe('success');
    });

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first.result.current.data).toEqual({ ok: true });
    expect(second.result.current.data).toEqual({ ok: true });
  });

  it('serves fresh cached data on remount without calling the factory again', async () => {
    const factory = vi.fn<() => Promise<{ count: number }>>()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    const first = renderHook(() => useRequest(factory, [], {
      cacheKey: 'fresh-request',
      staleMs: 60_000,
    }));

    await waitFor(() => expect(first.result.current.status).toBe('success'));
    first.unmount();

    const second = renderHook(() => useRequest(factory, [], {
      cacheKey: 'fresh-request',
      staleMs: 60_000,
    }));

    await waitFor(() => expect(second.result.current.status).toBe('success'));

    expect(factory).toHaveBeenCalledTimes(1);
    expect(second.result.current.data).toEqual({ count: 1 });
  });
});
