import { z } from 'zod';
import { ensureUserExists } from '../../controllers/users/shared.js';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

type UserXpTodayRow = {
  user_id: string;
  date: string | Date | null;
  xp_today: string | number | null;
};

type UserQuestsTodayRow = {
  user_id: string;
  total: string | number | null;
  completed: string | number | null;
};

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateString = (value: string | Date | null | undefined): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
};

export type GetUserSummaryTodayResponse = {
  date: string;
  xp_today: number;
  quests: {
    total: number;
    completed: number;
  };
};

export const getUserSummaryToday: AsyncHandler = async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request', detail: 'invalid uuid' });
  }

  const { id } = parsed.data;

  await ensureUserExists(id);

  const [xpResult, questsResult] = await Promise.all([
    pool.query<UserXpTodayRow>(
      `SELECT user_id, date, xp_today FROM v_user_xp_today WHERE user_id = $1`,
      [id],
    ),
    pool.query<UserQuestsTodayRow>(
      `SELECT user_id, total, completed FROM v_user_quests_today WHERE user_id = $1`,
      [id],
    ),
  ]);

  const xpRow = xpResult.rows[0];
  const questsRow = questsResult.rows[0];

  const date = toDateString(xpRow?.date ?? new Date());
  const xpToday = toNumber(xpRow?.xp_today);
  const questsTotal = toNumber(questsRow?.total);
  const questsCompleted = toNumber(questsRow?.completed);

  const body: GetUserSummaryTodayResponse = {
    date,
    xp_today: xpToday,
    quests: {
      total: questsTotal,
      completed: questsCompleted,
    },
  };

  return res.status(200).json(body);
};
