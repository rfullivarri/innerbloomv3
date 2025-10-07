import { Router } from 'express';
import { getUserEmotions } from '../controllers/emotions/get-user-emotions.js';
import { getUserDailyXp } from '../controllers/logs/get-user-daily-xp.js';
import { getUserJourney } from '../controllers/logs/get-user-journey.js';
import { getUserTasks } from '../controllers/tasks/get-user-tasks.js';
import { getCurrentUser } from '../controllers/users/get-user-me.js';
import { getUserLevel } from '../controllers/users/get-user-level.js';
import { getUserState } from '../controllers/users/get-user-state.js';
import { getUserStateTimeseries } from '../controllers/users/get-user-state-timeseries.js';
import { getUserTotalXp } from '../controllers/users/get-user-total-xp.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get('/users/:id/tasks', asyncHandler(getUserTasks));
router.get('/users/:id/xp/daily', asyncHandler(getUserDailyXp));
router.get('/users/:id/xp/total', asyncHandler(getUserTotalXp));
router.get('/users/:id/level', asyncHandler(getUserLevel));
router.get('/users/:id/journey', asyncHandler(getUserJourney));
router.get('/users/:id/emotions', asyncHandler(getUserEmotions));
router.get('/users/:id/state', asyncHandler(getUserState));
router.get('/users/:id/state/timeseries', asyncHandler(getUserStateTimeseries));
router.get('/users/me', asyncHandler(getCurrentUser));

export default router;
