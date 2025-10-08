import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';
import { buildLevelSummary } from './level-summary.js';
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

type NormalizedDailyXp = {
  date: string;
  xp: number;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

const STREAK_TARGET = 7;
const LEVEL_TARGET = 5;

export const getUserAchievements: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const dailyXpResult = await pool.query<DailyXpRow>(
    `SELECT date, xp_day
     FROM v_user_daily_xp
     WHERE user_id = $1
     ORDER BY date ASC`,
    [id],
  );

  const dailyXp = normalizeDailyXpRows(dailyXpResult.rows);
  const xpByDate = buildXpByDateMap(dailyXp);

  const today = startOfUtcDay(new Date());
  const streak = computeCurrentStreak(today, xpByDate);
  const streakEarnedAt = streak >= STREAK_TARGET
    ? toIsoDate(addDays(today, -(streak - STREAK_TARGET)))
    : null;

  const xpTotalResult = await pool.query<TotalXpRow>(
    `SELECT COALESCE(total_xp, 0) AS total_xp
     FROM v_user_total_xp
     WHERE user_id = $1`,
    [id],
  );

  const rawXpTotal = Number(xpTotalResult.rows[0]?.total_xp ?? 0);
  const xpTotal = Number.isFinite(rawXpTotal) ? Math.max(0, rawXpTotal) : 0;

  const thresholdsResult = await pool.query<LevelRow>(
    `SELECT level, xp_required
     FROM v_user_level
     WHERE user_id = $1
     ORDER BY level ASC`,
    [id],
  );

  const thresholds = normalizeLevelThresholds(thresholdsResult.rows);
  const summary = buildLevelSummary(xpTotal, thresholds);

  const targetThreshold = thresholds.find((threshold) => threshold.level === LEVEL_TARGET) ?? null;
  const levelEarnedAt =
    targetThreshold && xpTotal >= targetThreshold.xpRequired
      ? determineLevelEarnedAt(targetThreshold.xpRequired, dailyXp)
      : null;

  res.json({
    user_id: id,
    achievements: [
      {
        id: 'ach_streak_7',
        name: '7-Day Flame',
        earned_at: streakEarnedAt,
        progress: {
          current: streak,
          target: STREAK_TARGET,
          pct: computeProgressPct(streak, STREAK_TARGET),
        },
      },
      {
        id: 'ach_level_5',
        name: 'Level 5',
        earned_at: levelEarnedAt,
        progress: {
          current: summary.currentLevel,
          target: LEVEL_TARGET,
          pct: computeProgressPct(summary.currentLevel, LEVEL_TARGET),
        },
      },
    ],
  });
};

function normalizeDailyXpRows(rows: DailyXpRow[]): NormalizedDailyXp[] {
  const normalized: NormalizedDailyXp[] = [];

  for (const row of rows) {
    const date = normalizeDate(row.date);
    if (!date) {
      continue;
    }

    const value = Number(row.xp_day ?? 0);
    const xp = Number.isFinite(value) ? Math.max(0, value) : 0;

    normalized.push({
      date,
      xp,
    });
  }

  return normalized;
}

function buildXpByDateMap(entries: NormalizedDailyXp[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const entry of entries) {
    map.set(entry.date, (map.get(entry.date) ?? 0) + entry.xp);
  }

  return map;
}

function computeCurrentStreak(today: Date, xpByDate: Map<string, number>): number {
  let streak = 0;
  let cursor = today;

  while (true) {
    const key = formatDate(cursor);
    const xp = xpByDate.get(key) ?? 0;

    if (xp > 0) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }

    break;
  }

  return streak;
}

function determineLevelEarnedAt(xpRequired: number, entries: NormalizedDailyXp[]): string | null {
  if (xpRequired <= 0) {
    return null;
  }

  let cumulative = 0;

  for (const entry of entries) {
    cumulative += entry.xp;

    if (cumulative >= xpRequired) {
      return toIsoDate(parseDate(entry.date));
    }
  }

  return null;
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);

  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(startOfUtcDay(parsed));
  }

  return null;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, amount: number): Date {
  const clone = new Date(date.getTime());
  clone.setUTCDate(clone.getUTCDate() + amount);
  return clone;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function toIsoDate(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

function computeProgressPct(current: number, target: number): number {
  if (target <= 0) {
    return current > 0 ? 1 : 0;
  }

  const ratio = current / target;
  const clamped = Math.min(1, Math.max(0, ratio));
  return Math.round(clamped * 1000) / 1000;
}

function normalizeLevelThresholds(rows: LevelRow[]): LevelThreshold[] {
  const normalized = rows
    .map((row) => {
      const levelValue = Number(row.level ?? 0);
      const xpRequiredValue = Number(row.xp_required ?? 0);

      if (!Number.isFinite(levelValue) || !Number.isFinite(xpRequiredValue)) {
        return null;
      }

      return {
        level: Math.round(levelValue),
        xpRequired: Math.max(0, xpRequiredValue),
      } satisfies LevelThreshold;
    })
    .filter((value): value is LevelThreshold => value !== null)
    .sort((a, b) => a.level - b.level);

  const seen = new Set<number>();
  const unique: LevelThreshold[] = [];

  for (const threshold of normalized) {
    if (seen.has(threshold.level)) {
      continue;
    }

    seen.add(threshold.level);
    unique.push(threshold);
  }

  return unique;
}
