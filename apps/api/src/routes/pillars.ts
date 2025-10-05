import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/pillars',
  asyncHandler(async (_req, res) => {
    await db.execute(sql`select 1`);
    res.json([]);
  }),
);

export default router;
