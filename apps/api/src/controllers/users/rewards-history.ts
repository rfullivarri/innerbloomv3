import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRewardsHistoryMonthlyWrapups } from '../../services/monthlyWrappedService.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';
import {
  getUserPendingHabitAchievementCount,
  getUserRewardsHabitAchievementsByPillar,
} from '../../services/habitAchievementService.js';
import { countUnseenWeeklyWrapped, listSeenWeeklyWrappedIds } from '../../services/weeklyWrappedViewsService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

export const getUserRewardsHistory: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [weeklyWrapups, monthlyWrapups, achievedByPillar, pendingCount, unseenCount] = await Promise.all([
    getRecentWeeklyWrapped(id, 4),
    getRewardsHistoryMonthlyWrapups(id),
    getUserRewardsHabitAchievementsByPillar(id),
    getUserPendingHabitAchievementCount(id),
    countUnseenWeeklyWrapped(id),
  ]);
  const seenIds = await listSeenWeeklyWrappedIds(id, weeklyWrapups.map((entry) => entry.id));

  res.json({
    weekly_wrapups: weeklyWrapups.map((entry) => ({ ...entry, seen: seenIds.has(entry.id) })),
    weekly_unseen_count: unseenCount,
    monthly_wrapups: monthlyWrapups,
    habit_achievements: {
      pending_count: pendingCount,
      achieved_by_pillar: achievedByPillar,
    },
  });
};
