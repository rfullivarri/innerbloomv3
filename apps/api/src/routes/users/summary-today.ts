import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { uuidSchema } from '../../lib/validation.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

type XpTodayRow = {
  xp_today: string | number | null;
};

type AggregateXpRow = {
  xp: string | number | null;
};

type CountRow = {
  total: string | number | null;
};

type CompletedRow = {
  completed: string | number | null;
};

type UserTimezoneRow = {
  timezone: string | null;
  today: string | null;
};

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export type GetUserSummaryTodayResponse = {
  date: string;
  xp_today: number;
  quests: {
    total: number;
    completed: number;
  };
};

/**
 * @openapi
 * /users/{id}/summary/today:
 *   get:
 *     summary: Get today's hero summary for a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Today's summary was found
 *       '400':
 *         description: Invalid user id
 *       '404':
 *         description: User not found
 */
export const getUserSummaryToday: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  const userResult = await pool.query<UserTimezoneRow>(
    `SELECT COALESCE(timezone, 'UTC') AS timezone,
            timezone(COALESCE(timezone, 'UTC'), now())::date::text AS today
       FROM users
      WHERE user_id = $1
      LIMIT 1`,
    [id],
  );

  if (userResult.rowCount === 0) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  const today = userResult.rows[0]?.today ?? new Date().toISOString().slice(0, 10);

  const xpTodayResult = await pool.query<XpTodayRow>(
    `SELECT xp_today
       FROM v_user_xp_today
      WHERE user_id = $1
      LIMIT 1`,
    [id],
  );

  let xpToday = 0;

  if ((xpTodayResult.rowCount ?? 0) > 0) {
    xpToday = toNumber(xpTodayResult.rows[0]?.xp_today);
  } else {
    const xpFallbackResult = await pool.query<AggregateXpRow>(
      `SELECT COALESCE(SUM(dl.quantity * COALESCE(t.xp_base, cd.xp_base, 0)), 0) AS xp
         FROM daily_log dl
         JOIN tasks t ON t.task_id = dl.task_id
    LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
        WHERE dl.user_id = $1
          AND dl.date = $2`,
      [id, today],
    );

    xpToday = toNumber(xpFallbackResult.rows[0]?.xp);
  }

  const [totalResult, completedResult] = await Promise.all([
    pool.query<CountRow>(
      `SELECT COUNT(*) AS total
         FROM tasks
        WHERE user_id = $1
          AND active = true`,
      [id],
    ),
    pool.query<CompletedRow>(
      `SELECT COUNT(DISTINCT dl.task_id) AS completed
         FROM daily_log dl
        WHERE dl.user_id = $1
          AND dl.date = $2`,
      [id, today],
    ),
  ]);

  const total = toNumber(totalResult.rows[0]?.total);
  const completed = toNumber(completedResult.rows[0]?.completed);

  const response: GetUserSummaryTodayResponse = {
    date: today,
    xp_today: xpToday,
    quests: {
      total,
      completed,
    },
  };

  res.json(response);
};

