import { pool } from '../../db.js';
import { HttpError } from '../../lib/http-error.js';
import { PILLARS, type Pillar, type XpByDate } from './user-state-utils.js';

const PILLAR_ID_TO_NAME: Record<number, Pillar> = {
  1: 'Body',
  2: 'Mind',
  3: 'Soul',
};

export type UserProfile = {
  userId: string;
  modeCode: string;
  modeName: string | null;
  weeklyTarget: number;
  timezone: string | null;
};

export type XpBaseByPillar = Record<Pillar, number>;

export type LogStats = {
  uniqueDays: number;
  firstDate: string | null;
};

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const result = await pool.query<{
    user_id: string;
    mode_code: string | null;
    weekly_target: number | null;
    mode_name: string | null;
    timezone: string | null;
  }>(
    `SELECT u.user_id,
            COALESCE(gm.code, u.game_mode) AS mode_code,
            gm.name AS mode_name,
            COALESCE(gm.weekly_target, u.weekly_target) AS weekly_target,
            u.timezone
       FROM users u
  LEFT JOIN cat_game_mode gm
         ON (gm.game_mode_id = u.game_mode_id)
         OR (gm.code = u.game_mode)
      WHERE u.user_id = $1
      LIMIT 1`,
    [userId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  const row = result.rows[0];

  return {
    userId: row.user_id,
    modeCode: (row.mode_code ?? 'CHILL').toUpperCase(),
    modeName: row.mode_name,
    weeklyTarget: Number(row.weekly_target ?? 0),
    timezone: row.timezone,
  };
}

export async function getXpBaseByPillar(userId: string): Promise<XpBaseByPillar> {
  const result = await pool.query<{
    pillar_id: number;
    xp_base: string | number;
  }>(
    `SELECT t.pillar_id, SUM(t.xp_base) AS xp_base
       FROM tasks t
       JOIN users u ON u.user_id = t.user_id
      WHERE t.user_id = $1
        AND t.tasks_group_id = u.tasks_group_id
        AND t.active = TRUE
   GROUP BY t.pillar_id`,
    [userId],
  );

  const base: XpBaseByPillar = { Body: 0, Mind: 0, Soul: 0 };

  for (const row of result.rows) {
    const pillarName = PILLAR_ID_TO_NAME[row.pillar_id];

    if (!pillarName) {
      continue;
    }

    base[pillarName] = Number(row.xp_base ?? 0);
  }

  return base;
}

export async function getDailyXpSeriesByPillar(
  userId: string,
  from: string,
  to: string,
): Promise<XpByDate> {
  const result = await pool.query<{
    date: string;
    pillar_id: number;
    xp_day: string | number;
  }>(
    `SELECT dl.date, t.pillar_id, SUM(dl.quantity * t.xp_base) AS xp_day
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
      WHERE dl.user_id = $1
        AND dl.date BETWEEN $2 AND $3
   GROUP BY dl.date, t.pillar_id`,
    [userId, from, to],
  );

  const series: XpByDate = new Map();

  for (const row of result.rows) {
    const pillarName = PILLAR_ID_TO_NAME[row.pillar_id];

    if (!pillarName) {
      continue;
    }

    const current = series.get(row.date) ?? {};
    current[pillarName] = Number(row.xp_day ?? 0);
    series.set(row.date, current);
  }

  return series;
}

export async function getUserLogStats(userId: string): Promise<LogStats> {
  const result = await pool.query<{
    first_date: string | null;
    unique_days: string | number | null;
  }>(
    `SELECT MIN(date) AS first_date,
            COUNT(DISTINCT date) AS unique_days
       FROM daily_log
      WHERE user_id = $1`,
    [userId],
  );

  const row = result.rows[0];

  return {
    uniqueDays: Number(row?.unique_days ?? 0),
    firstDate: row?.first_date ?? null,
  };
}

export {
  addDays,
  computeDailyTargets,
  computeDecayRates,
  computeGainFactors,
  computeHalfLife,
  enumerateDates,
  formatDateInTimezone,
  propagateEnergy,
} from './user-state-utils.js';

export type {
  DailyTargetByPillar,
  DecayRateByPillar,
  GainFactorByPillar,
  HalfLifeByPillar,
  Pillar,
  PropagateOptions,
  PropagatedSeriesRow,
  PropagationResult,
  XpByDate,
} from './user-state-utils.js';
