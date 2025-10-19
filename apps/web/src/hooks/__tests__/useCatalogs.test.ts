import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty, Pillar, Stat, Trait } from '../../lib/api/catalogs';

const catalogMocks = vi.hoisted(() => ({
  fetchPillarsMock: vi.fn<[], Promise<Pillar[]>>(),
  fetchTraitsMock: vi.fn<[string], Promise<Trait[]>>(),
  fetchStatsMock: vi.fn<[string], Promise<Stat[]>>(),
  fetchDifficultiesMock: vi.fn<[], Promise<Difficulty[]>>(),
}));

vi.mock('../../lib/api/catalogs', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api/catalogs')>(
    '../../lib/api/catalogs',
  );

  return {
    ...actual,
    fetchCatalogPillars: catalogMocks.fetchPillarsMock,
    fetchCatalogTraits: catalogMocks.fetchTraitsMock,
    fetchCatalogStats: catalogMocks.fetchStatsMock,
    fetchCatalogDifficulties: catalogMocks.fetchDifficultiesMock,
  };
});

import { useDifficulties, usePillars, useStats, useTraits } from '../useCatalogs';

describe('useCatalogs hooks', () => {
  beforeEach(() => {
    catalogMocks.fetchPillarsMock.mockReset();
    catalogMocks.fetchTraitsMock.mockReset();
    catalogMocks.fetchStatsMock.mockReset();
    catalogMocks.fetchDifficultiesMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads pillars successfully', async () => {
    const pillars: Pillar[] = [
      { id: 'pillar-1', code: 'body', name: 'Cuerpo', description: null },
      { id: 'pillar-2', code: 'mind', name: 'Mente', description: null },
    ];
    catalogMocks.fetchPillarsMock.mockResolvedValueOnce(pillars);

    const { result } = renderHook(() => usePillars());

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(pillars);
    expect(result.current.error).toBeNull();
    expect(catalogMocks.fetchPillarsMock).toHaveBeenCalledTimes(1);
  });

  it('exposes errors when pillars cannot be loaded', async () => {
    const error = new Error('Network down');
    catalogMocks.fetchPillarsMock.mockRejectedValueOnce(error);

    const { result } = renderHook(() => usePillars());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toEqual([]);
  });

  it('disables traits requests until a pillar id is provided', () => {
    const { result } = renderHook(() => useTraits(''));

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toEqual([]);
    expect(catalogMocks.fetchTraitsMock).not.toHaveBeenCalled();

    result.current.reload();

    expect(catalogMocks.fetchTraitsMock).not.toHaveBeenCalled();
  });

  it('loads traits when the pillar id is available', async () => {
    const traits: Trait[] = [
      { id: 'trait-1', pillarId: 'pillar-1', code: 'focus', name: 'Enfoque', description: null },
      { id: 'trait-2', pillarId: 'pillar-2', code: 'energy', name: 'Energía', description: null },
    ];
    catalogMocks.fetchTraitsMock.mockResolvedValueOnce(traits);

    const { result } = renderHook(() => useTraits('pillar-1'));

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(traits);
    expect(catalogMocks.fetchTraitsMock).toHaveBeenCalledWith('pillar-1');
  });

  it('reports errors when stats fail to load', async () => {
    const error = new Error('Stats broken');
    catalogMocks.fetchStatsMock.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStats('trait-1'));

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe(error);
  });

  it('loads difficulties successfully', async () => {
    const difficulties: Difficulty[] = [
      { id: 'easy', code: 'easy', name: 'Fácil', description: null, xpBase: 5 },
      { id: 'hard', code: 'hard', name: 'Difícil', description: null, xpBase: 20 },
    ];
    catalogMocks.fetchDifficultiesMock.mockResolvedValueOnce(difficulties);

    const { result } = renderHook(() => useDifficulties());

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.data).toEqual(difficulties);
    expect(result.current.error).toBeNull();
    expect(catalogMocks.fetchDifficultiesMock).toHaveBeenCalledTimes(1);
  });
});
