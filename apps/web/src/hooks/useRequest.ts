import { DependencyList, useCallback, useEffect, useState } from 'react';

type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type UseRequestResult<T> = {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
  reload: () => void;
};

export function useRequest<T>(factory: () => Promise<T>, deps: DependencyList = []): UseRequestResult<T> {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(() => {
    let cancelled = false;
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
  }, deps);

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
