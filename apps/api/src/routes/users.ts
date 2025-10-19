import { Router } from 'express';
import { getUserEmotions } from '../controllers/emotions/get-user-emotions.js';
import { getUserDailyXp } from '../controllers/logs/get-user-daily-xp.js';
import { getUserJourney } from '../controllers/logs/get-user-journey.js';
import { getUserTasks } from '../controllers/tasks/get-user-tasks.js';
import { getCurrentUser } from '../controllers/users/get-user-me.js';
import { getUserAchievements } from '../controllers/users/get-user-achievements.js';
import { getUserLevel } from '../controllers/users/get-user-level.js';
import { getUserState } from '../controllers/users/get-user-state.js';
import { getUserStateTimeseries } from '../controllers/users/get-user-state-timeseries.js';
import { getUserTotalXp } from '../controllers/users/get-user-total-xp.js';
import { asyncHandler } from '../lib/async-handler.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { ownUserGuard } from '../middlewares/own-user-guard.js';

import { getUserStreakPanel } from './users/streak-panel.js';
import { getUserDailyEnergy } from './users/daily-energy.js';
import { getUserSummaryToday } from './users/summary-today.js';
import { getUserXpByTrait } from './users/xp-by-trait.js';
import { getUserPillars } from './users/pillars.js';
import missionsV2Router from '../modules/missions-v2/missions-v2.routes.js';

const router = Router();
const userScopedRoutes = Router({ mergeParams: true });

userScopedRoutes.get('/tasks', asyncHandler(getUserTasks));
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
userScopedRoutes.use('/missions/v2', missionsV2Router);

router.get('/users/me', authMiddleware, asyncHandler(getCurrentUser));
router.use('/users/:id', authMiddleware, ownUserGuard, userScopedRoutes);

export default router;
export type { GetUserSummaryTodayResponse } from './users/summary-today.js';
