import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';
import { buildLevelSummary } from './level-summary.js';
import { computeThresholdsFromBaseXp } from './level-thresholds.js';
import type { LevelThreshold } from './types.js';

type DailyXpRow = {
  date: string;
  xp_day: string | number | null;
};

type TotalXpRow = {
  total_xp: string | number | null;
};

type LevelRow = {
  level: string | number | null;
  xp_required: string | number | null;
};

type XpBaseRow = {
  xp_base_sum: string | number | null;
};

type NormalizedDailyXp = {
  date: string;
  xp: number;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeDailyXp(rows: DailyXpRow[]): NormalizedDailyXp[] {
  const byDate = new Map<string, number>();

  for (const row of rows) {
    const dateKey = row.date?.slice(0, 10);

    if (!dateKey) {
      continue;
    }

    const rawValue = Number(row.xp_day ?? 0);
    const xpDay = Number.isFinite(rawValue) ? rawValue : 0;

    // Keep the maximum XP recorded for a date in case the view ever returns duplicates.
    const current = byDate.get(dateKey) ?? 0;
    byDate.set(dateKey, Math.max(current, xpDay));
  }

  return Array.from(byDate.entries())
    .map(([date, xp]) => ({ date, xp }))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
}

function computeCurrentStreak(rows: DailyXpRow[]): number {
  const series = normalizeDailyXp(rows);

  if (series.length === 0) {
    return 0;
  }

  let streak = 0;
  let previousDate: Date | null = null;

  for (const entry of series) {
    const date = new Date(`${entry.date}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    if (previousDate === null) {
      if (entry.xp <= 0) {
        break;
      }

      streak += 1;
      previousDate = date;
      continue;
    }

    const diffMs = previousDate.getTime() - date.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays !== 1) {
      break;
    }

    if (entry.xp <= 0) {
      break;
    }

    streak += 1;
    previousDate = date;
  }

  return streak;
}

function normalizeLevelThresholds(rows: LevelRow[]): LevelThreshold[] {
  return rows.map((row) => ({
    level: Number(row.level ?? 0),
    xpRequired: Number(row.xp_required ?? 0),
  }));
}

function toSafeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function buildAchievementProgress(current: number, target: number) {
  const safeTarget = Math.max(0, target);
  const safeCurrent = Math.max(0, current);

  const pct = safeTarget === 0 ? 100 : roundToSingleDecimal(Math.min(100, (safeCurrent / safeTarget) * 100));

  return {
    current: safeCurrent,
    target: safeTarget,
    pct,
  };
}

export const getUserAchievements: AsyncHandler = async (req, res) => {
  const parsedParams = paramsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({ error: 'bad_request', detail: 'invalid uuid' });
  }

  const { id } = parsedParams.data;

  await ensureUserExists(id);

  const [dailyXpResult, totalXpResult, levelThresholdsResult] = await Promise.all([
    pool.query<DailyXpRow>(
      `SELECT date, xp_day
       FROM v_user_daily_xp
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT 60`,
      [id],
    ),
    pool.query<TotalXpRow>(
      `SELECT COALESCE(total_xp, 0) AS total_xp
       FROM v_user_total_xp
       WHERE user_id = $1`,
      [id],
    ),
    pool.query<LevelRow>(
      `SELECT level, xp_required
       FROM v_user_level
       WHERE user_id = $1
       ORDER BY level ASC`,
      [id],
    ),
  ]);

  const streak = computeCurrentStreak(dailyXpResult.rows);

  const rawTotalXp = Number(totalXpResult.rows[0]?.total_xp ?? 0);
  const totalXp = toSafeNumber(rawTotalXp);
  let thresholds = normalizeLevelThresholds(levelThresholdsResult.rows);

  if (thresholds.length === 0) {
    const fallbackResult = await pool.query<XpBaseRow>(
      `SELECT COALESCE(SUM(CASE WHEN active THEN xp_base ELSE 0 END), 0) AS xp_base_sum
       FROM tasks
       WHERE user_id = $1`,
      [id],
    );

    const fallbackThresholds = computeThresholdsFromBaseXp(fallbackResult.rows[0]?.xp_base_sum);

    if (fallbackThresholds.length > 0) {
      thresholds = fallbackThresholds;
    }
  }
  const levelSummary = buildLevelSummary(totalXp, thresholds);
  const currentLevel = levelSummary.currentLevel;

  res.json({
    user_id: id,
    achievements: [
      {
        id: 'ach_streak_7',
        name: '7-Day Flame',
        earned_at: null,
        progress: buildAchievementProgress(streak, 7),
      },
      {
        id: 'ach_level_5',
        name: 'Level 5',
        earned_at: null,
        progress: buildAchievementProgress(currentLevel, 5),
      },
    ],
  });
};
