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

const TRAIT_FALLBACK_LABELS: Record<TraitKey, string> = {
  core: 'Core',
  bienestar: 'Bienestar',
  autogestion: 'Autogestión',
  intelecto: 'Intelecto',
  psiquis: 'Psiquis',
  salud_fisica: 'Salud física',
};

type TraitKey = (typeof TRAIT_ORDER)[number];

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = dateRangeQuerySchema;

type Row = {
  trait_code: string | null;
  trait_name: string | null;
  xp: string | number | null;
};

function sanitizeTraitCode(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }

  const sanitized = code
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized.length > 0 ? sanitized : null;
}

function normalizeTraitCode(code: string | null | undefined): TraitKey | null {
  const sanitized = sanitizeTraitCode(code);
  if (!sanitized) {
    return null;
  }

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
            ct.name AS trait_name,
            SUM(dl.quantity * t.xp_base) AS xp
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
      WHERE dl.user_id = $1${dateFilter}
   GROUP BY ct.code`,
    params,
  );

  const labels: Partial<Record<TraitKey, string>> = {};

  for (const row of result.rows) {
    const trait = normalizeTraitCode(row.trait_code);

    if (!trait) {
      continue;
    }

    const xp = Number(row.xp ?? 0);
    totals[trait] = (totals[trait] ?? 0) + (Number.isFinite(xp) ? xp : 0);

    const sanitizedCode = sanitizeTraitCode(row.trait_code);
    const isDirectMatch = sanitizedCode === trait;

    const name = row.trait_name?.toString().trim();
    if (name && isDirectMatch) {
      labels[trait] = name;
    }
  }

  res.json({
    traits: TRAIT_ORDER.map((trait) => ({
      trait,
      name: labels[trait] ?? TRAIT_FALLBACK_LABELS[trait],
      xp: Math.round(totals[trait] ?? 0),
    })),
  });
};
