import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';

type JourneyRow = {
  first_date_log: string | null;
  days_of_journey: string | number | null;
  quantity_daily_logs: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserJourney: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const result = await pool.query<JourneyRow>(
    `SELECT MIN(date) AS first_date_log,
            (CURRENT_DATE - MIN(date))::int AS days_of_journey,
            COUNT(DISTINCT date) AS quantity_daily_logs
     FROM daily_log
     WHERE user_id = $1`,
    [id],
  );

  const [row] = result.rows;

  if (!row || !row.first_date_log) {
    res.json({
      first_date_log: null,
      days_of_journey: 0,
      quantity_daily_logs: 0,
    });
    return;
  }

  res.json({
    first_date_log: row.first_date_log,
    days_of_journey: Number(row.days_of_journey ?? 0),
    quantity_daily_logs: Number(row.quantity_daily_logs ?? 0),
  });
};
