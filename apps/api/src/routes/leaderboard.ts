import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const { limit, offset } = leaderboardQuerySchema.parse(req.query);

    const finalLimit = limit ?? 10;
    const finalOffset = offset ?? 0;

    if (finalLimit > 50) {
      throw new HttpError(400, 'invalid_request', 'limit must be 50 or less');
    }

    res.json({
      limit: finalLimit,
      offset: finalOffset,
      users: [],
    });
  }),
);

export default router;
