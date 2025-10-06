import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';

type TotalXpRow = {
  total_xp: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserTotalXp: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const result = await pool.query<TotalXpRow>(
    `SELECT COALESCE(total_xp, 0) AS total_xp
     FROM v_user_total_xp
     WHERE user_id = $1`,
    [id],
  );

  const totalXp = Number(result.rows[0]?.total_xp ?? 0);

  res.json({ total_xp: totalXp });
};
