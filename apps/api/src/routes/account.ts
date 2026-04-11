import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import { getAccountDeletionService } from '../services/account-deletion-service.js';

const router = Router();

router.delete('/account', authMiddleware, asyncHandler(async (req, res) => {
  const user = req.user;

  if (!user) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const result = await getAccountDeletionService().deleteAccount({
    userId: user.id,
    clerkUserId: user.clerkId,
  });

  res.status(200).json({
    ok: true,
    deleted: result.deleted,
  });
}));

export default router;
