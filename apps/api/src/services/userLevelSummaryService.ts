import { pool } from '../db.js';
import { buildLevelSummary } from '../controllers/users/level-summary.js';
import { computeCanonicalLevelThresholds } from '../controllers/users/level-thresholds.js';

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

  const thresholds = computeCanonicalLevelThresholds();

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
