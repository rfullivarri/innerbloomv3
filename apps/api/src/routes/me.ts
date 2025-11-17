import { Router } from 'express';
import { getCurrentUserDailyReminderSettings, updateCurrentUserDailyReminderSettings } from '../controllers/daily-reminders/current-user-daily-reminder.js';
import { updateUserTimezone } from '../controllers/users/update-user-timezone.js';
import { asyncHandler } from '../lib/async-handler.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

router.get('/me/daily-reminder', authMiddleware, asyncHandler(getCurrentUserDailyReminderSettings));
router.put('/me/daily-reminder', authMiddleware, asyncHandler(updateCurrentUserDailyReminderSettings));
router.put('/me/timezone', authMiddleware, asyncHandler(updateUserTimezone));

export default router;
