import { Router } from 'express';
import { getUserEmotions } from '../controllers/emotions/get-user-emotions.js';
import { getUserDailyXp } from '../controllers/logs/get-user-daily-xp.js';
import { getUserJourney } from '../controllers/logs/get-user-journey.js';
import { createUserTask } from '../controllers/tasks/create-user-task.js';
import { classifyUserTask } from '../controllers/tasks/classify-user-task.js';
import { getUserTasks } from '../controllers/tasks/get-user-tasks.js';
import { getCurrentUser } from '../controllers/users/get-user-me.js';
import { getUserSubscription } from '../controllers/users/get-user-subscription.js';
import { getUserAchievements } from '../controllers/users/get-user-achievements.js';
import { getUserLevel } from '../controllers/users/get-user-level.js';
import { getUserState } from '../controllers/users/get-user-state.js';
import { getUserStateTimeseries } from '../controllers/users/get-user-state-timeseries.js';
import { getUserTotalXp } from '../controllers/users/get-user-total-xp.js';
import {
  getUserWeeklyWrappedLatest,
  getUserWeeklyWrappedPending,
  getUserWeeklyWrappedPrevious,
  markUserWeeklyWrappedSeen,
} from '../controllers/users/weekly-wrapped.js';
import { updateUserTask } from '../controllers/tasks/update-user-task.js';
import { getUserRewardsHistory } from '../controllers/users/rewards-history.js';
import { deleteUserTask } from '../controllers/tasks/delete-user-task.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { ownUserGuard } from '../middlewares/own-user-guard.js';
import { requireActiveSubscription } from '../middlewares/require-active-subscription.js';
import { withClient } from '../db.js';
import { resolveAvatarById, updateUserAvatar } from '../services/userAvatarUpdateService.js';

import { getUserStreakPanel } from './users/streak-panel.js';
import { getUserDailyEnergy } from './users/daily-energy.js';
import { getUserSummaryToday } from './users/summary-today.js';
import { getUserXpByTrait } from './users/xp-by-trait.js';
import { getUserPillars } from './users/pillars.js';
import missionsV2Router from '../modules/missions-v2/missions-v2.routes.js';

const router = Router();
const userScopedRoutes = Router({ mergeParams: true });

userScopedRoutes.get('/tasks', asyncHandler(getUserTasks));
userScopedRoutes.post('/tasks', asyncHandler(createUserTask));
userScopedRoutes.post('/tasks/classify', asyncHandler(classifyUserTask));
userScopedRoutes.patch('/tasks/:taskId', asyncHandler(updateUserTask));
userScopedRoutes.delete('/tasks/:taskId', asyncHandler(deleteUserTask));
userScopedRoutes.get('/xp/daily', asyncHandler(getUserDailyXp));
userScopedRoutes.get('/xp/total', asyncHandler(getUserTotalXp));
userScopedRoutes.get('/xp/by-trait', asyncHandler(getUserXpByTrait));
userScopedRoutes.get('/pillars', asyncHandler(getUserPillars));
userScopedRoutes.get('/streaks/panel', asyncHandler(getUserStreakPanel));
userScopedRoutes.get('/level', asyncHandler(getUserLevel));
userScopedRoutes.get('/achievements', asyncHandler(getUserAchievements));
userScopedRoutes.get('/daily-energy', asyncHandler(getUserDailyEnergy));
userScopedRoutes.get('/journey', asyncHandler(getUserJourney));
userScopedRoutes.get('/emotions', asyncHandler(getUserEmotions));
userScopedRoutes.get('/state', asyncHandler(getUserState));
userScopedRoutes.get('/state/timeseries', asyncHandler(getUserStateTimeseries));
userScopedRoutes.get('/summary/today', asyncHandler(getUserSummaryToday));
userScopedRoutes.get('/weekly-wrapped/latest', asyncHandler(getUserWeeklyWrappedLatest));
userScopedRoutes.get('/weekly-wrapped/previous', asyncHandler(getUserWeeklyWrappedPrevious));
userScopedRoutes.get('/weekly-wrapped/pending', asyncHandler(getUserWeeklyWrappedPending));
userScopedRoutes.post('/weekly-wrapped/:weeklyWrappedId/seen', asyncHandler(markUserWeeklyWrappedSeen));
userScopedRoutes.get('/rewards/history', asyncHandler(getUserRewardsHistory));
userScopedRoutes.use('/missions/v2', missionsV2Router);

router.get('/users/me', authMiddleware, asyncHandler(getCurrentUser));
router.put('/users/me/avatar', authMiddleware, asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const avatarIdRaw = req.body?.avatar_id;
  const avatarId =
    typeof avatarIdRaw === 'number' && Number.isInteger(avatarIdRaw)
      ? avatarIdRaw
      : Number.parseInt(String(avatarIdRaw ?? ''), 10);

  if (!Number.isInteger(avatarId) || avatarId <= 0) {
    throw new HttpError(400, 'invalid_avatar_id', 'avatar_id must be a positive integer');
  }

  const updated = await withClient(async (client) => {
    await resolveAvatarById(client, avatarId);
    return updateUserAvatar(client, {
      userId: user.id,
      avatarId,
    });
  });

  res.json({ ok: true, user: updated });
}));
router.get('/users/me/subscription', authMiddleware, asyncHandler(getUserSubscription));
router.use('/users/:id', authMiddleware, ownUserGuard, requireActiveSubscription, userScopedRoutes);

export default router;
export type { GetUserSummaryTodayResponse } from './users/summary-today.js';
