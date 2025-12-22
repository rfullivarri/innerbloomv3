import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import {
  addDays,
  computeDailyTargets,
  computeHalfLife,
  enumerateDates,
  formatDateInTimezone,
  getDailyXpSeriesByPillar,
  getUserLogStats,
  getUserProfile,
  getXpBaseByPillar,
  propagateEnergy,
  type Pillar,
  type PropagatedSeriesRow,
} from '../../controllers/users/user-state-service.js';
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

type EnergyTrend = {
  currentDate: string;
  previousDate: string;
  hasHistory: boolean;
  pillars: Record<Pillar, { current: number; previous: number | null; deltaPct: number | null }>;
};

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function calculateDelta(current: number, previous: number | null): number | null {
  if (previous === null || Math.abs(previous) < 0.0001) {
    return null;
  }

  return round(((current - previous) / Math.abs(previous)) * 100, 1);
}

function buildTrendResponse(
  dates: string[],
  series: PropagatedSeriesRow[],
  uniqueDays: number,
): EnergyTrend {
  const [currentDate, previousDate] = dates;
  const byDate = new Map(series.map((row) => [row.date, row]));
  const current = byDate.get(currentDate) ?? null;
  const previous = byDate.get(previousDate) ?? null;
  const hasHistory = uniqueDays >= 7 && Boolean(previous);

  const buildPillar = (pillar: Pillar) => {
    const currentValue = round(current?.[pillar] ?? 0, 1);
    const previousValue = hasHistory ? round(previous?.[pillar] ?? 0, 1) : null;

    return {
      current: currentValue,
      previous: previousValue,
      deltaPct: hasHistory ? calculateDelta(currentValue, previousValue) : null,
    };
  };

  return {
    currentDate,
    previousDate,
    hasHistory,
    pillars: {
      Body: buildPillar('Body'),
      Mind: buildPillar('Mind'),
      Soul: buildPillar('Soul'),
    },
  };
}

async function computeEnergyTrend(userId: string): Promise<EnergyTrend | null> {
  const profile = await getUserProfile(userId);
  const today = formatDateInTimezone(new Date(), profile.timezone);
  const previousDate = addDays(today, -7);

  const logStats = await getUserLogStats(userId);
  const xpBaseByPillar = await getXpBaseByPillar(userId);
  const halfLifeByPillar = computeHalfLife(profile.modeCode);
  const dailyTargets = computeDailyTargets(xpBaseByPillar, profile.weeklyTarget);
  const graceApplied = logStats.uniqueDays < 7;
  const graceUntilDate = logStats.firstDate ? addDays(logStats.firstDate, 6) : null;
  const propagationStart = logStats.firstDate
    ? logStats.firstDate < previousDate
      ? logStats.firstDate
      : previousDate
    : previousDate;
  const propagationDates = enumerateDates(propagationStart, today);

  if (propagationDates.length === 0) {
    return null;
  }

  const xpSeries =
    propagationDates.length > 0 ? await getDailyXpSeriesByPillar(userId, propagationStart, today) : new Map();

  const { series } = propagateEnergy({
    dates: propagationDates,
    xpByDate: xpSeries,
    halfLifeByPillar,
    dailyTargets,
    forceFullGrace: graceApplied,
    graceUntilDate,
  });

  const keyDates = [today, previousDate];

  return buildTrendResponse(keyDates, series, logStats.uniqueDays);
}

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

  const trend = await computeEnergyTrend(id);

  return res.json({
    user_id: row.user_id,
    hp_pct: toNumber(row.hp_pct),
    mood_pct: toNumber(row.mood_pct),
    focus_pct: toNumber(row.focus_pct),
    hp_norm: toNumber(row.hp_norm),
    mood_norm: toNumber(row.mood_norm),
    focus_norm: toNumber(row.focus_norm),
    trend,
  });
};
