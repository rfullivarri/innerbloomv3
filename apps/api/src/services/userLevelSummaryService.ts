import { pool } from '../db.js';
import { buildLevelSummary } from '../controllers/users/level-summary.js';
import { computeThresholdsFromBaseXp } from '../controllers/users/level-thresholds.js';
import type { LevelThreshold } from '../controllers/users/types.js';

export type UserLevelSummary = {
  currentLevel: number;
  xpTotal: number;
  xpRequiredCurrent: number;
  xpRequiredNext: number | null;
  xpToNext: number | null;
  progressPercent: number;
};

export async function loadUserLevelSummary(userId: string): Promise<UserLevelSummary> {
  const xpTotalResult = await pool.query<{ xp_total: string | number | null }>(
    `SELECT COALESCE(total_xp, 0) AS xp_total FROM v_user_total_xp WHERE user_id = $1 LIMIT 1`,
    [userId],
  );

  const rawXpTotal = Number(xpTotalResult.rows[0]?.xp_total ?? 0);
  const xpTotal = Number.isFinite(rawXpTotal) ? Math.max(0, rawXpTotal) : 0;

  const thresholdsResult = await pool.query<{ level: string | number | null; xp_required: string | number | null }>(
    `SELECT level, xp_required FROM v_user_level WHERE user_id = $1 ORDER BY level ASC`,
    [userId],
  );

  let thresholds: LevelThreshold[] = thresholdsResult.rows
    .map((row) => {
      const levelInput = row.level;
      const levelNumber = levelInput === null || levelInput === undefined ? null : Number(levelInput);
      const level = levelNumber === null || !Number.isFinite(levelNumber) || levelNumber < 0 ? null : levelNumber;
      const xpInput = row.xp_required;
      const xpNumber = xpInput === null || xpInput === undefined ? null : Number(xpInput);
      const xpRequired = xpNumber === null || !Number.isFinite(xpNumber) ? null : xpNumber;
      return {
        level,
        xpRequired,
      };
    })
    .filter((row): row is { level: number; xpRequired: number | null } => row.level !== null)
    .map((row) => ({
      level: Math.round(row.level),
      xpRequired: row.level === 0 ? 0 : Math.max(0, Number(row.xpRequired ?? 0)),
    }))
    .filter((threshold) => threshold.level === 0 || threshold.xpRequired > 0);

  const hasProgression = thresholds.some((threshold) => threshold.level > 0);

  if (thresholds.length === 0 || !hasProgression) {
    const fallbackResult = await pool.query<{ xp_base_sum: string | number | null }>(
      `SELECT COALESCE(SUM(CASE WHEN active THEN xp_base ELSE 0 END), 0) AS xp_base_sum
       FROM tasks
       WHERE user_id = $1`,
      [userId],
    );

    const fallbackThresholds = computeThresholdsFromBaseXp(fallbackResult.rows[0]?.xp_base_sum);

    if (fallbackThresholds.length > 0) {
      thresholds = fallbackThresholds;
    }
  }

  const summary = buildLevelSummary(xpTotal, thresholds);

  return {
    currentLevel: summary.currentLevel,
    xpTotal,
    xpRequiredCurrent: summary.xpRequiredCurrent,
    xpRequiredNext: summary.xpRequiredNext,
    xpToNext: summary.xpToNext,
    progressPercent: summary.progressPercent,
  };
}
