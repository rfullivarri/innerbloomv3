import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

const PILLAR_CODES = ['BODY', 'MIND', 'SOUL'] as const;
const BASE_UNIT = 1;

type WeeklyTargetRow = {
  weekly_target: string | number | null;
};

type PillarProgressRow = {
  pillar_code: string | null;
  xp_total: string | number | null;
  xp_week: string | number | null;
};

const toNumber = (value: string | number | null | undefined): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const getUserPillars: AsyncHandler = async (req, res) => {
  const parsed = paramsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({ error: 'bad_request', detail: 'invalid uuid' });
  }

  const { id } = parsed.data;

  const weeklyTargetResult = await pool.query<WeeklyTargetRow>(
    `SELECT COALESCE(gm_id.weekly_target, gm_code.weekly_target, u.weekly_target, 0) AS weekly_target
       FROM users u
  LEFT JOIN cat_game_mode gm_id
         ON gm_id.game_mode_id = u.game_mode_id
  LEFT JOIN cat_game_mode gm_code
         ON gm_code.code = u.game_mode
      WHERE u.user_id = $1
      LIMIT 1`,
    [id],
  );

  if (weeklyTargetResult.rows.length === 0) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  const weeklyTarget = toNumber(weeklyTargetResult.rows[0]?.weekly_target);

  const pillarsResult = await pool.query<PillarProgressRow>(
    `SELECT cp.code AS pillar_code,
            SUM(dl.quantity * t.xp_base) AS xp_total,
            SUM(
              CASE
                WHEN dl.date >= CURRENT_DATE - INTERVAL '6 days' THEN dl.quantity * t.xp_base
                ELSE 0
              END
            ) AS xp_week
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
      WHERE dl.user_id = $1
   GROUP BY cp.code`,
    [id],
  );

  const totals = new Map<string, { xp: number; xpWeek: number }>();

  for (const row of pillarsResult.rows) {
    const code = row.pillar_code?.toUpperCase();

    if (!code || !PILLAR_CODES.includes(code as (typeof PILLAR_CODES)[number])) {
      continue;
    }

    totals.set(code, {
      xp: toNumber(row.xp_total),
      xpWeek: toNumber(row.xp_week),
    });
  }

  const targetForWeek = weeklyTarget * BASE_UNIT;

  const payload = PILLAR_CODES.map((code) => {
    const stats = totals.get(code) ?? { xp: 0, xpWeek: 0 };
    const progress =
      targetForWeek > 0 ? Math.min(100, Math.round((stats.xpWeek / targetForWeek) * 100)) : 0;

    return {
      code,
      xp: stats.xp,
      xp_week: stats.xpWeek,
      progress_pct: progress,
    };
  });

  return res.json({
    user_id: id,
    pillars: payload,
  });
};

export default getUserPillars;
