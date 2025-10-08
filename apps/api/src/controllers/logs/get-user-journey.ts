import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';

type JourneyRow = {
  first_date_log: string | null;
  days_of_journey: string | number | null;
  quantity_daily_logs: string | number | null;
  first_programmed: boolean | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserJourney: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const result = await pool.query<JourneyRow>(
    `SELECT MIN(dl.date) AS first_date_log,
            (CURRENT_DATE - MIN(dl.date))::int AS days_of_journey,
            COUNT(DISTINCT dl.date) AS quantity_daily_logs,
            u.first_programmed
     FROM users u
     LEFT JOIN daily_log dl ON dl.user_id = u.user_id
     WHERE u.user_id = $1
     GROUP BY u.first_programmed`,
    [id],
  );

  const [row] = result.rows;

  const firstProgrammed = Boolean(row?.first_programmed);

  if (!row || !row.first_date_log) {
    res.json({
      first_date_log: null,
      days_of_journey: 0,
      quantity_daily_logs: 0,
      first_programmed: firstProgrammed,
    });
    return;
  }

  res.json({
    first_date_log: row.first_date_log,
    days_of_journey: Number(row.days_of_journey ?? 0),
    quantity_daily_logs: Number(row.quantity_daily_logs ?? 0),
    first_programmed: firstProgrammed,
  });
};
