import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from './shared.js';
import { loadUserLevelSummary } from '../../services/userLevelSummaryService.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

export const getUserLevel: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);

  await ensureUserExists(id);

  const summary = await loadUserLevelSummary(id);

  res.json({
    user_id: id,
    current_level: summary.currentLevel,
    xp_total: summary.xpTotal,
    xp_required_current: summary.xpRequiredCurrent,
    xp_required_next: summary.xpRequiredNext,
    xp_to_next: summary.xpToNext,
    progress_percent: summary.progressPercent,
  });
};
