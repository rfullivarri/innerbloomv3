import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { parseWithValidation } from '../lib/validation.js';

const router = Router();

const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50, 'limit must be 50 or less').optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    let limit: number | undefined;
    let offset: number | undefined;

    try {
      const parsed = parseWithValidation(leaderboardQuerySchema, req.query);
      limit = parsed.limit;
      offset = parsed.offset;
    } catch (error) {
      if (error instanceof HttpError && error.code === 'invalid_request') {
        throw new HttpError(error.status, error.code, error.message);
      }

      throw error;
    }

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
