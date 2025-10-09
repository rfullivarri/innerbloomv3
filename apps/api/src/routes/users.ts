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

const router = Router();

router.get('/users/:id/tasks', authMiddleware, ownUserGuard, asyncHandler(getUserTasks));
router.get('/users/:id/xp/daily', authMiddleware, ownUserGuard, asyncHandler(getUserDailyXp));
router.get('/users/:id/xp/total', authMiddleware, ownUserGuard, asyncHandler(getUserTotalXp));
router.get('/users/:id/xp/by-trait', authMiddleware, ownUserGuard, asyncHandler(getUserXpByTrait));
router.get('/users/:id/pillars', authMiddleware, ownUserGuard, asyncHandler(getUserPillars));
router.get('/users/:id/streaks/panel', authMiddleware, ownUserGuard, asyncHandler(getUserStreakPanel));
router.get('/users/:id/level', authMiddleware, ownUserGuard, asyncHandler(getUserLevel));
router.get('/users/:id/achievements', authMiddleware, ownUserGuard, asyncHandler(getUserAchievements));
router.get('/users/:id/daily-energy', authMiddleware, ownUserGuard, asyncHandler(getUserDailyEnergy));
router.get('/users/:id/journey', authMiddleware, ownUserGuard, asyncHandler(getUserJourney));
router.get('/users/:id/emotions', authMiddleware, ownUserGuard, asyncHandler(getUserEmotions));
router.get('/users/:id/state', authMiddleware, ownUserGuard, asyncHandler(getUserState));
router.get('/users/:id/state/timeseries', authMiddleware, ownUserGuard, asyncHandler(getUserStateTimeseries));
router.get('/users/:id/summary/today', authMiddleware, ownUserGuard, asyncHandler(getUserSummaryToday));
router.get('/users/me', authMiddleware, asyncHandler(getCurrentUser));

export default router;
export type { GetUserSummaryTodayResponse } from './users/summary-today.js';
