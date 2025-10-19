import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  listCatalogDifficulties,
  listCatalogPillars,
  listCatalogStats,
  listCatalogTraits,
} from './catalog.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: {
    query: mockQuery,
  },
}));

function createResponse() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();

  return { json, status } as unknown as Response;
}

describe('catalog routes', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('lists catalog pillars normalizing identifiers and names', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: '1', pillar_id: 1, code: 'BODY', name: 'Cuerpo', description: null },
        { id: null, pillar_id: 2, code: null, name: null, description: 'Focus' },
      ],
    });

    const res = createResponse();

    await listCatalogPillars({} as Request, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toContain('FROM cat_pillar');
    expect(res.json).toHaveBeenCalledWith([
      { id: '1', pillar_id: '1', code: 'BODY', name: 'Cuerpo', description: null },
      { id: '2', pillar_id: '2', code: '2', name: '2', description: 'Focus' },
    ]);
  });

  it('requires pillar_id when listing traits', async () => {
    await expect(
      listCatalogTraits({ query: {} } as Request, createResponse(), vi.fn()),
    ).rejects.toMatchObject({
      status: 400,
      code: 'invalid_request',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('lists traits filtering by numeric pillar identifier', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: '10', trait_id: 10, pillar_id: 2, code: 'FOCUS', name: null, description: null },
      ],
    });

    const req = { query: { pillar_id: '2' } } as unknown as Request;
    const res = createResponse();

    await listCatalogTraits(req, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE t.pillar_id = $1'), [2]);
    expect(res.json).toHaveBeenCalledWith([
      { id: '10', trait_id: '10', pillar_id: '2', code: 'FOCUS', name: 'FOCUS', description: null },
    ]);
  });

  it('lists traits filtering by pillar code in a case-insensitive way', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: '11', trait_id: 11, pillar_id: 3, code: null, name: 'Insight', description: null },
      ],
    });

    const req = { query: { pillar_id: 'soul' } } as unknown as Request;
    const res = createResponse();

    await listCatalogTraits(req, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('upper(p.code) = $1'), ['SOUL']);
    expect(res.json).toHaveBeenCalledWith([
      { id: '11', trait_id: '11', pillar_id: '3', code: '11', name: 'Insight', description: null },
    ]);
  });

  it('requires trait_id when listing stats', async () => {
    await expect(
      listCatalogStats({ query: {} } as Request, createResponse(), vi.fn()),
    ).rejects.toMatchObject({
      status: 400,
      code: 'invalid_request',
    });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('lists stats filtering by trait id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '21',
          stat_id: 21,
          trait_id: 21,
          pillar_id: 1,
          code: 'STAMINA',
          name: null,
          description: null,
          unit: 'minutes',
        },
      ],
    });

    const req = { query: { trait_id: '21' } } as unknown as Request;
    const res = createResponse();

    await listCatalogStats(req, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE t.trait_id = $1'), [21]);
    expect(res.json).toHaveBeenCalledWith([
      {
        id: '21',
        stat_id: '21',
        trait_id: '21',
        pillar_id: '1',
        code: 'STAMINA',
        name: 'STAMINA',
        description: null,
        unit: 'minutes',
      },
    ]);
  });

  it('lists stats filtering by trait code case-insensitively', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: '33',
          stat_id: 33,
          trait_id: 33,
          pillar_id: 2,
          code: null,
          name: 'Focus time',
          description: null,
          unit: null,
        },
      ],
    });

    const req = { query: { trait_id: 'focus_time' } } as unknown as Request;
    const res = createResponse();

    await listCatalogStats(req, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('upper(t.code) = $1'), ['FOCUS_TIME']);
    expect(res.json).toHaveBeenCalledWith([
      {
        id: '33',
        stat_id: '33',
        trait_id: '33',
        pillar_id: '2',
        code: '33',
        name: 'Focus time',
        description: null,
        unit: null,
      },
    ]);
  });

  it('lists catalog difficulties and normalizes xp_base as a number', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'easy', difficulty_id: 1, code: 'Easy', name: null, description: null, xp_base: '5' },
      ],
    });

    const res = createResponse();

    await listCatalogDifficulties({} as Request, res, vi.fn());

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[0]).toContain('FROM cat_difficulty');
    expect(res.json).toHaveBeenCalledWith([
      { id: 'easy', difficulty_id: '1', code: 'Easy', name: 'Easy', description: null, xp_base: 5 },
    ]);
  });
});
