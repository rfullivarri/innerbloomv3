import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRewardsHistoryMonthlyWrapups } from '../../services/monthlyWrappedService.js';
import {
  getUserPendingHabitAchievementCount,
  getUserRewardsHabitAchievementsByPillar,
} from '../../services/habitAchievementService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

export const getUserRewardsHistory: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [monthlyWrapups, achievedByPillar, pendingCount] = await Promise.all([
    getRewardsHistoryMonthlyWrapups(id),
    getUserRewardsHabitAchievementsByPillar(id),
    getUserPendingHabitAchievementCount(id),
  ]);

  res.json({
    monthly_wrapups: monthlyWrapups,
    habit_achievements: {
      pending_count: pendingCount,
      achieved_by_pillar: achievedByPillar,
    },
  });
};
