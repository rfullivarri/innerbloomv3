import { useCallback, useMemo } from 'react';

import {
  fetchCatalogDifficulties,
  fetchCatalogPillars,
  fetchCatalogStats,
  fetchCatalogTraits,
  type Difficulty,
  type Pillar,
  type Stat,
  type Trait,
} from '../lib/api/catalogs';
import { useRequest, type AsyncStatus } from './useRequest';

const EMPTY_ARRAY: never[] = [];

type CatalogHookResult<T> = {
  data: T[];
  status: AsyncStatus;
  error: Error | null;
  isLoading: boolean;
  reload: () => void;
};

function createDisabledResult<T>(): CatalogHookResult<T> {
  return {
    data: [],
    status: 'idle',
    error: null,
    isLoading: false,
    reload: () => {
      /* noop */
    },
  };
}

export function usePillars(): CatalogHookResult<Pillar> {
  const { data, status, error, reload } = useRequest(fetchCatalogPillars, []);

  const isLoading = status === 'loading';
  const pillars = (data ?? EMPTY_ARRAY) as Pillar[];

  return useMemo(
    () => ({
      data: pillars,
      status,
      error,
      isLoading,
      reload,
    }),
    [pillars, status, error, isLoading, reload],
  );
}

export function useTraits(pillarId?: string | null): CatalogHookResult<Trait> {
  const normalizedId = pillarId?.toString().trim() ?? '';
  const enabled = normalizedId.length > 0;

  const { data, status, error, reload } = useRequest(
    () => fetchCatalogTraits(normalizedId),
    [normalizedId],
    { enabled },
  );

  const disabledResult = useMemo(() => createDisabledResult<Trait>(), []);

  const guardedReload = useCallback(() => {
    if (!enabled) {
      return;
    }
    reload();
  }, [enabled, reload]);

  const traits = (data ?? EMPTY_ARRAY) as Trait[];
  const isLoading = status === 'loading';

  return useMemo(
    () => {
      if (!enabled) {
        return disabledResult;
      }

      return {
        data: traits,
        status,
        error,
        isLoading,
        reload: guardedReload,
      } satisfies CatalogHookResult<Trait>;
    },
    [disabledResult, enabled, traits, status, error, isLoading, guardedReload],
  );
}

export function useStats(traitId?: string | null): CatalogHookResult<Stat> {
  const normalizedId = traitId?.toString().trim() ?? '';
  const enabled = normalizedId.length > 0;

  const { data, status, error, reload } = useRequest(
    () => fetchCatalogStats(normalizedId),
    [normalizedId],
    { enabled },
  );

  const disabledResult = useMemo(() => createDisabledResult<Stat>(), []);

  const guardedReload = useCallback(() => {
    if (!enabled) {
      return;
    }
    reload();
  }, [enabled, reload]);

  const stats = (data ?? EMPTY_ARRAY) as Stat[];
  const isLoading = status === 'loading';

  return useMemo(
    () => {
      if (!enabled) {
        return disabledResult;
      }

      return {
        data: stats,
        status,
        error,
        isLoading,
        reload: guardedReload,
      } satisfies CatalogHookResult<Stat>;
    },
    [disabledResult, enabled, stats, status, error, isLoading, guardedReload],
  );
}

export function useDifficulties(): CatalogHookResult<Difficulty> {
  const { data, status, error, reload } = useRequest(fetchCatalogDifficulties, []);

  const isLoading = status === 'loading';
  const difficulties = (data ?? EMPTY_ARRAY) as Difficulty[];

  return useMemo(
    () => ({
      data: difficulties,
      status,
      error,
      isLoading,
      reload,
    }),
    [difficulties, status, error, isLoading, reload],
  );
}
