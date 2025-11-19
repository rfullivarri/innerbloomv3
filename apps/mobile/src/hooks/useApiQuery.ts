import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

type Options = {
  enabled?: boolean;
};

export function useApiQuery<T>(
  factory: () => Promise<T>,
  deps: DependencyList,
  options: Options = {},
) {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  const memoizedFactory = useCallback(factory, deps);

  const execute = useCallback(async () => {
    if (!enabled) {
      return null;
    }
    setStatus('loading');
    setError(null);
    try {
      const result = await memoizedFactory();
      setData(result);
      setStatus('success');
      return result;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      setStatus('error');
      throw normalized;
    }
  }, [enabled, memoizedFactory]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void execute();
  }, [enabled, execute]);

  const reload = useCallback(() => {
    if (!enabled) {
      return;
    }
    void execute();
  }, [enabled, execute]);

  return { data, status, error, reload } as const;
}
