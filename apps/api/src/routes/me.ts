import { Router } from 'express';
import { updateUserTimezone } from '../controllers/users/update-user-timezone.js';
import { asyncHandler } from '../lib/async-handler.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

router.put('/me/timezone', authMiddleware, asyncHandler(updateUserTimezone));

export default router;
