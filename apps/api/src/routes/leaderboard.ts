import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
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
      throw new HttpError(400, 'limit must be 50 or less');
    }

    const result = await db.execute<{
      user_id: string;
      total_xp: string | number | null;
      level: string | number | null;
      display_name: string | null;
    }>(sql`
      SELECT
        mup.user_id,
        mup.total_xp,
        mup.level,
        u.display_name
      FROM mv_user_progress mup
      LEFT JOIN users u ON u.id = mup.user_id
      ORDER BY mup.total_xp DESC, mup.user_id ASC
      LIMIT ${finalLimit}
      OFFSET ${finalOffset}
    `);

    res.json({
      limit: finalLimit,
      offset: finalOffset,
      users: result.rows.map((row) => ({
        userId: row.user_id,
        totalXp: Number(row.total_xp ?? 0),
        level: Number(row.level ?? 1),
        displayName: row.display_name ?? null,
      })),
    });
  }),
);

export default router;
