import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';

type DailyEnergyRow = {
  user_id: string;
  hp_pct: string | number | null;
  mood_pct: string | number | null;
  focus_pct: string | number | null;
  hp_norm: string | number | null;
  mood_norm: string | number | null;
  focus_norm: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * @openapi
 * /users/{id}/daily-energy:
 *   get:
 *     summary: Get today's daily energy snapshot for a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Daily energy was found
 *       '400':
 *         description: Invalid user id
 *       '404':
 *         description: Daily energy not found
 */
export const getUserDailyEnergy: AsyncHandler = async (req, res) => {
  // TODO: Add Clerk authentication middleware (Level 1)
  const parsed = paramsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request', detail: 'invalid uuid' });
  }

  const { id } = parsed.data;

  const sql = `
    SELECT user_id,
           ROUND(hp_pct::numeric, 1)   AS hp_pct,
           ROUND(mood_pct::numeric, 1) AS mood_pct,
           ROUND(focus_pct::numeric, 1) AS focus_pct,
           hp_norm,
           mood_norm,
           focus_norm
      FROM v_user_daily_energy
     WHERE user_id = $1
  `;

  const result = await pool.query<DailyEnergyRow>(sql, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  const row = result.rows[0];

  return res.json({
    user_id: row.user_id,
    hp_pct: toNumber(row.hp_pct),
    mood_pct: toNumber(row.mood_pct),
    focus_pct: toNumber(row.focus_pct),
    hp_norm: toNumber(row.hp_norm),
    mood_norm: toNumber(row.mood_norm),
    focus_norm: toNumber(row.focus_norm),
  });
};
