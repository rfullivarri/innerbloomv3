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

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = dateRangeQuerySchema;

type Row = {
  user_id: string;
  trait_id: number;
  trait_code: string | null;
  trait_name: string | null;
  pillar_code: string | null;
  xp: string | number | null;
};

export type TraitXpRow = {
  trait_id: number;
  trait_code: string | null;
  trait_name: string | null;
  pillar_code: string | null;
  xp: number;
};

export const getUserXpByTrait: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = querySchema.parse(req.query);

  await ensureUserExists(id);

  const hasExplicitRange = Boolean(from || to);
  const range = hasExplicitRange ? resolveDateRange({ from, to }, 60) : null;

  const params: (string | number)[] = [id];
  let dateFilter = '';

  if (range) {
    const fromIndex = params.length + 1;
    params.push(formatAsDateString(range.from));
    const toIndex = params.length + 1;
    params.push(formatAsDateString(range.to));
    dateFilter = ` AND dl.date BETWEEN $${fromIndex} AND $${toIndex}`;
  }

  const result = await pool.query<Row>(
    `SELECT dl.user_id,
            ct.trait_id,
            ct.code  AS trait_code,
            ct.name  AS trait_name,
            cp.code  AS pillar_code,
            SUM(cd.xp_base * GREATEST(dl.quantity, 1)) AS xp
       FROM daily_log dl
       JOIN tasks t          ON t.task_id = dl.task_id
       JOIN cat_trait ct     ON ct.trait_id = t.trait_id
       JOIN cat_pillar cp    ON cp.pillar_id = t.pillar_id
       JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE dl.user_id = $1${dateFilter}
   GROUP BY dl.user_id, ct.trait_id, ct.code, ct.name, cp.code
   ORDER BY ct.trait_id`,
    params,
  );

  const traits: TraitXpRow[] = result.rows.map((row) => ({
    trait_id: row.trait_id,
    trait_code: row.trait_code,
    trait_name: row.trait_name,
    pillar_code: row.pillar_code,
    xp: Number(row.xp ?? 0) || 0,
  }));

  res.json(traits);
};
