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
  emotion_code: string | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserEmotions: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = dateRangeQuerySchema.parse(req.query);

  await ensureUserExists(id);

  const range = resolveDateRange({ from, to }, 90);

  const result = await pool.query<EmotionRow>(
    `SELECT el.date,
            ce.code AS emotion_code
       FROM emotions_logs el
  LEFT JOIN cat_emotion ce ON ce.emotion_id = el.emotion_id
      WHERE el.user_id = $1
        AND el.date BETWEEN $2 AND $3
   ORDER BY el.date`,
    [id, formatAsDateString(range.from), formatAsDateString(range.to)],
  );

  res.json({
    user_id: id,
    range: {
      from: formatAsDateString(range.from),
      to: formatAsDateString(range.to),
    },
    days: result.rows.map((row) => ({
      date: row.date,
      emotion: row.emotion_code,
      intensity: null,
    })),
  });
};
