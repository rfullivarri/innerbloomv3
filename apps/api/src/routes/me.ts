import { Router } from 'express';
import { updateUserTimezone } from '../controllers/users/update-user-timezone.js';
import {
  getCurrentUserDailyReminder,
  upsertCurrentUserDailyReminder,
} from '../controllers/users/user-daily-reminder.js';
import { asyncHandler } from '../lib/async-handler.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

router.put('/me/timezone', authMiddleware, asyncHandler(updateUserTimezone));
router.get('/me/daily-reminder', authMiddleware, asyncHandler(getCurrentUserDailyReminder));
router.put('/me/daily-reminder', authMiddleware, asyncHandler(upsertCurrentUserDailyReminder));

export default router;
