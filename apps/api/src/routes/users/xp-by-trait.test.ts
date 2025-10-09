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

  it('aggregates XP totals per trait with optional date filters', async () => {
    const { getUserXpByTrait } = await import('./xp-by-trait.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { trait_code: 'Core', xp: '10' },
        { trait_code: 'salud-fisica', xp: '5' },
        { trait_code: null, xp: '100' },
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
      expect.stringContaining('FROM daily_log dl'),
      ['b1c04c5e-a555-4bb7-9f20-a7847bef7f53', '2024-05-01', '2024-05-10'],
    );
    expect(res.json).toHaveBeenCalledWith({
      traits: expect.arrayContaining([
        { trait: 'core', xp: 10 },
        { trait: 'salud_fisica', xp: 5 },
      ]),
    });
  });

  it('works without an explicit range and normalizes trait aliases', async () => {
    const { getUserXpByTrait } = await import('./xp-by-trait.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { trait_code: 'auto-gestion', xp: '7' },
        { trait_code: 'intelectual', xp: '3' },
      ],
    });

    const req = { params: { id: '2ef1ec4a-8960-4d27-bf93-e7b956bb6c9d' }, query: {} } as unknown as Request;
    const res = createResponse();

    await getUserXpByTrait(req, res, vi.fn());

    expect(mockPoolQuery).toHaveBeenCalledWith(expect.any(String), ['2ef1ec4a-8960-4d27-bf93-e7b956bb6c9d']);
    expect(res.json).toHaveBeenCalledWith({
      traits: expect.arrayContaining([
        { trait: 'autogestion', xp: 7 },
        { trait: 'intelecto', xp: 3 },
      ]),
    });
  });

  it('ignores malformed trait codes and returns zero totals when nothing matches', async () => {
    const { getUserXpByTrait } = await import('./xp-by-trait.js');

    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        { trait_code: '???', xp: 'NaN' },
        { trait_code: 'core_total', xp: null },
      ],
    });

    const req = {
      params: { id: 'a0f934dc-16e8-4aa2-9061-1b9e2270c887' },
      query: { from: '', to: '' },
    } as unknown as Request;
    const res = createResponse();

    await getUserXpByTrait(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      traits: [
        { trait: 'core', xp: 0 },
        { trait: 'bienestar', xp: 0 },
        { trait: 'autogestion', xp: 0 },
        { trait: 'intelecto', xp: 0 },
        { trait: 'psiquis', xp: 0 },
        { trait: 'salud_fisica', xp: 0 },
      ],
    });
  });
});
