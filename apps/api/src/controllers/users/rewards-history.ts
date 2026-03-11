import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRewardsHistoryMonthlyWrapups } from '../../services/monthlyWrappedService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

export const getUserRewardsHistory: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const monthlyWrapups = await getRewardsHistoryMonthlyWrapups(id);

  res.json({
    monthly_wrapups: monthlyWrapups,
  });
};
