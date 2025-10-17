import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';
import { buildLevelSummary } from './level-summary.js';
import { computeThresholdsFromBaseXp } from './level-thresholds.js';
import type { LevelThreshold } from './types.js';

type LevelRow = {
  level: string | number | null;
  xp_required: string | number | null;
};

type TotalXpRow = {
  xp_total: string | number | null;
};

type XpBaseRow = {
  xp_base_sum: string | number | null;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserLevel: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const xpTotalResult = await pool.query<TotalXpRow>(
    `SELECT COALESCE(total_xp, 0) AS xp_total
     FROM v_user_total_xp
     WHERE user_id = $1`,
    [id],
  );

  const rawXpTotal = Number(xpTotalResult.rows[0]?.xp_total ?? 0);
  const xpTotal = Number.isFinite(rawXpTotal) ? Math.max(0, rawXpTotal) : 0;

  const thresholdsResult = await pool.query<LevelRow>(
    `SELECT level, xp_required
     FROM v_user_level
     WHERE user_id = $1
     ORDER BY level ASC`,
    [id],
  );

  let thresholds: LevelThreshold[] = thresholdsResult.rows.map((row) => ({
    level: Number(row.level ?? 0),
    xpRequired: Number(row.xp_required ?? 0),
  }));

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

  // Business rules summary:
  // - current_level is the highest level whose xp_required threshold is <= xp_total (immediate level ups).
  // - xp_required_next and progress are measured against the next level, if any (0..50 inclusive).
  // - xp_to_next never dips below zero and progress is clamped to [0, 100] with one decimal precision.
  const summary = buildLevelSummary(xpTotal, thresholds);

  res.json({
    user_id: id,
    current_level: summary.currentLevel,
    xp_total: xpTotal,
    xp_required_current: summary.xpRequiredCurrent,
    xp_required_next: summary.xpRequiredNext,
    xp_to_next: summary.xpToNext,
    progress_percent: summary.progressPercent,
  });
};
