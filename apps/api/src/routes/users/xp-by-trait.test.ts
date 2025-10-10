import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnsureUserExists, mockPoolQuery } = vi.hoisted(() => ({
  mockEnsureUserExists: vi.fn(),
  mockPoolQuery: vi.fn(),
}));

vi.mock('../../controllers/users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
}));

function createResponse() {
  const json = vi.fn();
  return { json } as unknown as Response;
}

describe('getUserXpByTrait', () => {
  beforeEach(() => {
    mockEnsureUserExists.mockReset();
    mockPoolQuery.mockReset();
  });

  it('returns ordered trait XP rows with an explicit date range', async () => {
    const { getUserXpByTrait } = await import('./xp-by-trait.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'user-1',
          trait_id: 1,
          trait_code: 'core',
          trait_name: 'Core',
          pillar_code: 'body',
          xp: '90',
        },
        {
          user_id: 'user-1',
          trait_id: 2,
          trait_code: 'autogestion',
          trait_name: 'Autogestión',
          pillar_code: 'mind',
          xp: '45',
        },
      ],
    });

    const req = {
      params: { id: 'b1c04c5e-a555-4bb7-9f20-a7847bef7f53' },
      query: { from: '2024-05-01', to: '2024-05-10' },
    } as unknown as Request;
    const res = createResponse();

    await getUserXpByTrait(req, res, vi.fn());

    expect(mockEnsureUserExists).toHaveBeenCalledWith('b1c04c5e-a555-4bb7-9f20-a7847bef7f53');
    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('SUM(cd.xp_base * GREATEST(dl.quantity, 1))'),
      ['b1c04c5e-a555-4bb7-9f20-a7847bef7f53', '2024-05-01', '2024-05-10'],
    );
    expect(mockPoolQuery.mock.calls[0][0]).toContain('ORDER BY ct.trait_id');
    expect(res.json).toHaveBeenCalledWith([
      {
        trait_id: 1,
        trait_code: 'core',
        trait_name: 'Core',
        pillar_code: 'body',
        xp: 90,
      },
      {
        trait_id: 2,
        trait_code: 'autogestion',
        trait_name: 'Autogestión',
        pillar_code: 'mind',
        xp: 45,
      },
    ]);
  });

  it('falls back to zero XP when the database returns nullish totals', async () => {
    const { getUserXpByTrait } = await import('./xp-by-trait.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'user-2',
          trait_id: 5,
          trait_code: 'psiquis',
          trait_name: 'Psiquis',
          pillar_code: 'soul',
          xp: null,
        },
        {
          user_id: 'user-2',
          trait_id: 6,
          trait_code: 'salud_fisica',
          trait_name: 'Salud física',
          pillar_code: 'body',
          xp: 'NaN',
        },
      ],
    });

    const req = {
      params: { id: '2ef1ec4a-8960-4d27-bf93-e7b956bb6c9d' },
      query: {},
    } as unknown as Request;
    const res = createResponse();

    await getUserXpByTrait(req, res, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledWith(expect.any(String), ['2ef1ec4a-8960-4d27-bf93-e7b956bb6c9d']);
    expect(res.json).toHaveBeenCalledWith([
      {
        trait_id: 5,
        trait_code: 'psiquis',
        trait_name: 'Psiquis',
        pillar_code: 'soul',
        xp: 0,
      },
      {
        trait_id: 6,
        trait_code: 'salud_fisica',
        trait_name: 'Salud física',
        pillar_code: 'body',
        xp: 0,
      },
    ]);
  });
});
