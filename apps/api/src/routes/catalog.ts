import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { asyncHandler, type AsyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

const LIST_PILLARS_SQL = `
  SELECT
    pillar_id::text AS id,
    pillar_id,
    code,
    name,
    NULL::text AS description
  FROM cat_pillar
  ORDER BY pillar_id ASC
`;

const LIST_TRAITS_BASE_SQL = `
  SELECT
    t.trait_id::text AS id,
    t.trait_id,
    t.pillar_id,
    t.code,
    t.name,
    NULL::text AS description
  FROM cat_trait t
  JOIN cat_pillar p ON p.pillar_id = t.pillar_id
`;

const LIST_STATS_BASE_SQL = `
  SELECT
    t.trait_id::text AS id,
    t.trait_id AS stat_id,
    t.trait_id,
    t.pillar_id,
    t.code,
    t.name,
    NULL::text AS description,
    NULL::text AS unit
  FROM cat_trait t
`;

const LIST_DIFFICULTY_SQL = `
  SELECT
    difficulty_id::text AS id,
    difficulty_id,
    code,
    name,
    NULL::text AS description,
    xp_base
  FROM cat_difficulty
  ORDER BY difficulty_id ASC
`;

type PillarRow = {
  id: string | null;
  pillar_id: string | number | null;
  code: string | null;
  name: string | null;
  description: string | null;
};

type TraitRow = {
  id: string | null;
  trait_id: string | number | null;
  pillar_id: string | number | null;
  code: string | null;
  name: string | null;
  description: string | null;
};

type StatRow = {
  id: string | null;
  stat_id: string | number | null;
  trait_id: string | number | null;
  pillar_id: string | number | null;
  code: string | null;
  name: string | null;
  description: string | null;
  unit: string | null;
};

type DifficultyRow = {
  id: string | null;
  difficulty_id: string | number | null;
  code: string | null;
  name: string | null;
  description: string | null;
  xp_base: string | number | null;
};

const listTraitsQuerySchema = z.object({
  pillar_id: z
    .string({ required_error: 'pillar_id is required' })
    .trim()
    .min(1, { message: 'pillar_id is required' }),
});

const listStatsQuerySchema = z.object({
  trait_id: z
    .string({ required_error: 'trait_id is required' })
    .trim()
    .min(1, { message: 'trait_id is required' }),
});

function toId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  return null;
}

export const listCatalogPillars: AsyncHandler = async (_req, res) => {
  const result = await pool.query<PillarRow>(LIST_PILLARS_SQL);

  const pillars = result.rows.map((row) => {
    const id = toId(row.id) ?? toId(row.pillar_id) ?? row.code ?? null;
    const pillarId = toId(row.pillar_id) ?? id;
    const code = row.code ?? id ?? '';
    const name = row.name ?? code;

    return {
      id,
      pillar_id: pillarId,
      code,
      name,
      description: row.description ?? null,
    };
  });

  res.json(pillars);
};

export const listCatalogTraits: AsyncHandler = async (req, res) => {
  const parsed = listTraitsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(400, 'invalid_request', 'pillar_id is required');
  }

  const pillarInput = parsed.data.pillar_id;
  const numericId = Number.parseInt(pillarInput, 10);

  let sql: string;
  let values: unknown[];

  if (!Number.isNaN(numericId)) {
    sql = `${LIST_TRAITS_BASE_SQL} WHERE t.pillar_id = $1 ORDER BY t.trait_id ASC`;
    values = [numericId];
  } else {
    sql = `${LIST_TRAITS_BASE_SQL} WHERE upper(p.code) = $1 ORDER BY t.trait_id ASC`;
    values = [pillarInput.toUpperCase()];
  }

  const result = await pool.query<TraitRow>(sql, values);

  const traits = result.rows.map((row) => {
    const id = toId(row.id) ?? toId(row.trait_id) ?? row.code ?? null;
    const traitId = toId(row.trait_id) ?? id;
    const pillarId = toId(row.pillar_id);
    const code = row.code ?? traitId ?? '';
    const name = row.name ?? code;

    return {
      id,
      trait_id: traitId,
      pillar_id: pillarId,
      code,
      name,
      description: row.description ?? null,
    };
  });

  res.json(traits);
};

export const listCatalogStats: AsyncHandler = async (req, res) => {
  const parsed = listStatsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new HttpError(400, 'invalid_request', 'trait_id is required');
  }

  const traitInput = parsed.data.trait_id;
  const numericId = Number.parseInt(traitInput, 10);

  let sql: string;
  let values: unknown[];

  if (!Number.isNaN(numericId)) {
    sql = `${LIST_STATS_BASE_SQL} WHERE t.trait_id = $1 ORDER BY t.trait_id ASC`;
    values = [numericId];
  } else {
    sql = `${LIST_STATS_BASE_SQL} WHERE upper(t.code) = $1 ORDER BY t.trait_id ASC`;
    values = [traitInput.toUpperCase()];
  }

  const result = await pool.query<StatRow>(sql, values);

  const stats = result.rows.map((row) => {
    const id = toId(row.id) ?? toId(row.stat_id) ?? toId(row.trait_id);
    const traitId = toId(row.trait_id) ?? id;
    const pillarId = toId(row.pillar_id);
    const code = row.code ?? traitId ?? '';
    const name = row.name ?? code;

    return {
      id,
      stat_id: id,
      trait_id: traitId,
      pillar_id: pillarId,
      code,
      name,
      description: row.description ?? null,
      unit: row.unit ?? null,
    };
  });

  res.json(stats);
};

export const listCatalogDifficulties: AsyncHandler = async (_req, res) => {
  const result = await pool.query<DifficultyRow>(LIST_DIFFICULTY_SQL);

  const difficulties = result.rows.map((row) => {
    const id = toId(row.id) ?? toId(row.difficulty_id) ?? row.code ?? null;
    const difficultyId = toId(row.difficulty_id) ?? id;
    const code = row.code ?? difficultyId ?? '';
    const name = row.name ?? code;
    const xpBase = toNumber(row.xp_base);

    return {
      id,
      difficulty_id: difficultyId,
      code,
      name,
      description: row.description ?? null,
      xp_base: xpBase,
    };
  });

  res.json(difficulties);
};

router.get('/catalog/pillars', authMiddleware, asyncHandler(listCatalogPillars));
router.get('/catalog/traits', authMiddleware, asyncHandler(listCatalogTraits));
router.get('/catalog/stats', authMiddleware, asyncHandler(listCatalogStats));
router.get('/catalog/difficulty', authMiddleware, asyncHandler(listCatalogDifficulties));

export default router;
