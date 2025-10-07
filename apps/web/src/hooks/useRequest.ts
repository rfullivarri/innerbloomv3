import { DependencyList, useCallback, useEffect, useState } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type UseRequestResult<T> = {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
  reload: () => void;
};

type UseRequestOptions = {
  enabled?: boolean;
};

export function useRequest<T>(
  factory: () => Promise<T>,
  deps: DependencyList = [],
  options: UseRequestOptions = {},
): UseRequestResult<T> {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options.enabled ?? true;

  const execute = useCallback(() => {
    let cancelled = false;

    if (!enabled) {
      setStatus('idle');
      setError(null);
      setData(null);
      return () => {
        cancelled = true;
      };
    }

    setStatus('loading');
    setError(null);

    factory()
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

    return () => {
      cancelled = true;
    };
  }, [...deps, enabled]);

  useEffect(() => {
    const cleanup = execute();
    return () => {
      cleanup?.();
    };
  }, [execute]);

  return {
    data,
    error,
    status,
    reload: () => {
      execute();
    }
  };
}
