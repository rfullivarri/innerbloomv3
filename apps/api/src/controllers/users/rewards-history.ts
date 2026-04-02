import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRewardsHistoryMonthlyWrapups } from '../../services/monthlyWrappedService.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';
import { pool } from '../../db.js';
import {
  getUserPendingHabitAchievementCount,
  getUserRewardsHabitAchievementsByPillar,
} from '../../services/habitAchievementService.js';
import { countUnseenWeeklyWrapped, listSeenWeeklyWrappedIds } from '../../services/weeklyWrappedViewsService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

type DateRange = { start: string; end: string };

async function listCompletionDays(userId: string, range: DateRange): Promise<string[]> {
  const result = await pool.query<{ day_key: string }>(
    `SELECT DISTINCT date::text AS day_key
       FROM daily_log
      WHERE user_id = $1::uuid
        AND date >= $2::date
        AND date <= $3::date
        AND COALESCE(quantity, 0) > 0
   ORDER BY day_key ASC`,
    [userId, range.start, range.end],
  );
  return result.rows.map((row) => row.day_key);
}

function resolveMonthRange(periodKey: string): DateRange | null {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  return {
    start: monthStart.toISOString().slice(0, 10),
    end: monthEnd.toISOString().slice(0, 10),
  };
}

export const getUserRewardsHistory: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [weeklyWrapups, monthlyWrapups, achievedByPillar, pendingCount, unseenCount] = await Promise.all([
    getRecentWeeklyWrapped(id, 2),
    getRewardsHistoryMonthlyWrapups(id),
    getUserRewardsHabitAchievementsByPillar(id),
    getUserPendingHabitAchievementCount(id),
    countUnseenWeeklyWrapped(id),
  ]);
  const seenIds = await listSeenWeeklyWrappedIds(id, weeklyWrapups.map((entry) => entry.id));
  const weeklyCompletionDaysById = new Map(
    await Promise.all(
      weeklyWrapups.map(async (entry) => [entry.id, await listCompletionDays(id, { start: entry.weekStart, end: entry.weekEnd })] as const),
    ),
  );
  const monthlyCompletionDaysById = new Map(
    await Promise.all(
      monthlyWrapups.map(async (entry) => {
        const range = resolveMonthRange(entry.periodKey);
        const completionDays = range ? await listCompletionDays(id, range) : [];
        return [entry.id, completionDays] as const;
      }),
    ),
  );

  res.json({
    weekly_wrapups: weeklyWrapups.map((entry) => ({
      ...entry,
      seen: seenIds.has(entry.id),
      completionDays: weeklyCompletionDaysById.get(entry.id) ?? [],
    })),
    weekly_unseen_count: unseenCount,
    monthly_wrapups: monthlyWrapups.map((entry) => ({
      ...entry,
      completionDays: monthlyCompletionDaysById.get(entry.id) ?? [],
    })),
    habit_achievements: {
      pending_count: pendingCount,
      achieved_by_pillar: achievedByPillar,
    },
  });
};
