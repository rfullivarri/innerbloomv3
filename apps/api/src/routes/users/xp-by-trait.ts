import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import {
  dateRangeQuerySchema,
  formatAsDateString,
  resolveDateRange,
  uuidSchema,
} from '../../lib/validation.js';
import { ensureUserExists } from '../../controllers/users/shared.js';

const TRAIT_ORDER = [
  'core',
  'bienestar',
  'autogestion',
  'intelecto',
  'psiquis',
  'salud_fisica',
] as const;

type TraitKey = (typeof TRAIT_ORDER)[number];

type Row = {
  trait_code: string | null;
  xp: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = dateRangeQuerySchema;

function normalizeTraitCode(code: string | null | undefined): TraitKey | null {
  if (!code) {
    return null;
  }

  const sanitized = code
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const matched = TRAIT_ORDER.find((trait) => {
    if (trait === sanitized) {
      return true;
    }

    switch (trait) {
      case 'autogestion':
        return ['auto_gestion', 'autogestion', 'gestion', 'auto-gestion'].includes(sanitized);
      case 'salud_fisica':
        return [
          'salud_fisica',
          'saludfisica',
          'salud_fisico',
          'salud_fisica_total',
          'salud-fisica',
          'salud_fisica_foundations',
        ].includes(sanitized);
      case 'psiquis':
        return ['psiquis', 'psique', 'psiquis_total'].includes(sanitized);
      case 'bienestar':
        return ['bienestar', 'bien_estar'].includes(sanitized);
      case 'intelecto':
        return ['intelecto', 'intelectual'].includes(sanitized);
      case 'core':
        return ['core', 'corazon', 'core_total'].includes(sanitized);
      default:
        return false;
    }
  });

  return matched ?? null;
}

export const getUserXpByTrait: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = querySchema.parse(req.query);

  await ensureUserExists(id);

  const hasExplicitRange = Boolean(from || to);
  const range = hasExplicitRange ? resolveDateRange({ from, to }, 60) : null;

  const totals: Record<TraitKey, number> = {
    core: 0,
    bienestar: 0,
    autogestion: 0,
    intelecto: 0,
    psiquis: 0,
    salud_fisica: 0,
  };

  const params: string[] = [id];
  let dateFilter = '';

  if (range) {
    const fromIndex = params.length + 1;
    params.push(formatAsDateString(range.from));
    const toIndex = params.length + 1;
    params.push(formatAsDateString(range.to));
    dateFilter = ` AND dl.date BETWEEN $${fromIndex} AND $${toIndex}`;
  }

  const result = await pool.query<Row>(
    `SELECT ct.code AS trait_code,
            SUM(dl.quantity * t.xp_base) AS xp
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
      WHERE dl.user_id = $1${dateFilter}
   GROUP BY ct.code`,
    params,
  );

  for (const row of result.rows) {
    const trait = normalizeTraitCode(row.trait_code);

    if (!trait) {
      continue;
    }

    const xp = Number(row.xp ?? 0);
    totals[trait] = (totals[trait] ?? 0) + (Number.isFinite(xp) ? xp : 0);
  }

  res.json({
    traits: TRAIT_ORDER.map((trait) => ({
      trait,
      xp: Math.round(totals[trait] ?? 0),
    })),
  });
};
