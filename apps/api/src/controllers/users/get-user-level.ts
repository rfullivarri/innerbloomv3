import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';

type LevelRow = {
  level: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserLevel: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const result = await pool.query<LevelRow>(
    `SELECT level
     FROM v_user_level
     WHERE user_id = $1`,
    [id],
  );

  const level = Number(result.rows[0]?.level ?? 0);

  res.json({ level });
};
