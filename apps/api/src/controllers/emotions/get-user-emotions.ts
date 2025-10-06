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

type EmotionRow = {
  date: string;
  emotion_id: string | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserEmotions: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = dateRangeQuerySchema.parse(req.query);

  await ensureUserExists(id);

  const range = resolveDateRange({ from, to });

  const result = await pool.query<EmotionRow>(
    `SELECT date, emotion_id
     FROM emotions_logs
     WHERE user_id = $1
       AND date BETWEEN $2 AND $3
     ORDER BY date`,
    [id, formatAsDateString(range.from), formatAsDateString(range.to)],
  );

  res.json({
    from: formatAsDateString(range.from),
    to: formatAsDateString(range.to),
    emotions: result.rows,
  });
};
