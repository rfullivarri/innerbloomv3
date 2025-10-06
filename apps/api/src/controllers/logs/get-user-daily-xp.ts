import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import {
  dateRangeQuerySchema,
  formatAsDateString,
  resolveDateRange,
  uuidSchema,
} from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';

type DailyXpRow = {
  date: string;
  xp_day: string | number;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserDailyXp: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = dateRangeQuerySchema.parse(req.query);

  await ensureUserExists(id);

  const range = resolveDateRange({ from, to });

  const result = await pool.query<DailyXpRow>(
    `SELECT date, xp_day
     FROM v_user_daily_xp
     WHERE user_id = $1
       AND date BETWEEN $2 AND $3
     ORDER BY date`,
    [id, formatAsDateString(range.from), formatAsDateString(range.to)],
  );

  const series = result.rows.map((row: DailyXpRow) => ({
    date: row.date,
    xp_day: Number(row.xp_day ?? 0),
  }));

  res.json({
    from: formatAsDateString(range.from),
    to: formatAsDateString(range.to),
    series,
  });
};
