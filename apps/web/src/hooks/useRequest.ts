import { DependencyList, useCallback, useEffect, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type UseRequestResult<T> = {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
  reload: () => Promise<void>;
};

type UseRequestOptions = {
  enabled?: boolean;
  cacheKey?: string | null;
  staleMs?: number;
};

type RequestCacheEntry<T> = {
  data?: T;
  updatedAt: number;
  inflight?: Promise<T>;
};

const requestCache = new Map<string, RequestCacheEntry<unknown>>();

export function invalidateRequestCache(keyOrPrefix?: string) {
  if (!keyOrPrefix) {
    requestCache.clear();
    return;
  }

  for (const key of requestCache.keys()) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      requestCache.delete(key);
    }
  }
}

export function useRequest<T>(
  factory: () => Promise<T>,
  deps: DependencyList = [],
  options: UseRequestOptions = {},
): UseRequestResult<T> {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options.enabled ?? true;
  const cacheKey = options.cacheKey?.trim() || null;
  const staleMs = options.staleMs ?? 0;

  const execute = useCallback((force = false) => {
    let cancelled = false;

    if (!enabled) {
      setStatus('idle');
      setError(null);
      setData(null);
      return { cancel: () => { cancelled = true; }, promise: Promise.resolve() };
    }

    const cached = cacheKey ? requestCache.get(cacheKey) as RequestCacheEntry<T> | undefined : undefined;
    const now = Date.now();
    const hasCachedData = cached && Object.prototype.hasOwnProperty.call(cached, 'data');
    const isFresh = Boolean(hasCachedData && staleMs > 0 && now - cached!.updatedAt <= staleMs);

    if (!force && hasCachedData) {
      setData(cached!.data ?? null);
      setStatus('success');
      setError(null);

      if (isFresh) {
        return { cancel: () => { cancelled = true; }, promise: Promise.resolve() };
      }
    } else {
      setStatus('loading');
      setError(null);
    }

    const request =
      cacheKey && cached?.inflight && !force
        ? cached.inflight
        : factory().then((result) => {
            if (cacheKey) {
              requestCache.set(cacheKey, {
                data: result,
                updatedAt: Date.now(),
              });
            }
            return result;
          });

    if (cacheKey && (!cached?.inflight || force)) {
      const entry = requestCache.get(cacheKey) as RequestCacheEntry<T> | undefined;
      const nextEntry: RequestCacheEntry<T> = {
        updatedAt: entry?.updatedAt ?? 0,
        inflight: request,
      };
      if (entry && entry.data !== undefined) {
        nextEntry.data = entry.data;
      }
      requestCache.set(cacheKey, nextEntry);
      request.finally(() => {
        const latest = requestCache.get(cacheKey);
        if (latest?.inflight === request) {
          delete latest.inflight;
        }
      });
    }

    setError(null);

    const promise = request
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus('success');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setStatus('error');
      });

    return {
      cancel: () => {
        cancelled = true;
      },
      promise,
    };
  }, [...deps, enabled, cacheKey, staleMs]);

  useEffect(() => {
    const { cancel } = execute(false);
    return () => {
      cancel();
    };
  }, [execute]);

  return {
    data,
    error,
    status,
    reload: () => {
      const { promise } = execute(true);
      return promise;
    },
  };
}

export function useQuery<T>(
  factory: () => Promise<T>,
  deps: DependencyList = [],
  options: UseRequestOptions = {},
): UseRequestResult<T> {
  return useRequest(factory, deps, options);
}
