import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { parseWithValidation } from '../lib/validation.js';

const router = Router();

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50, 'limit must be 50 or less').optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parseWithValidation(leaderboardQuerySchema, req.query);

    const finalLimit = limit ?? 10;
    const finalOffset = offset ?? 0;

    res.json({
      limit: finalLimit,
      offset: finalOffset,
      users: [],
    });
  }),
);

export default router;
