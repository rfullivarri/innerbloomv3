import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { listInAppFeedbackDefinitions } from '../services/feedbackInApp.service.js';

const router = Router();

router.get(
  '/feedback/in-app',
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const items = await listInAppFeedbackDefinitions();
    res.json({ items });
  }),
);

export default router;
