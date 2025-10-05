import { Router } from 'express';
import { asc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { pillars } from '../db/schema.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/pillars',
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select({
        id: pillars.id,
        name: pillars.name,
        description: pillars.description,
      })
      .from(pillars)
      .orderBy(asc(pillars.name));

    res.json(
      rows.map((row) => ({
        ...row,
        description: row.description ?? '',
      })),
    );
  }),
);

export default router;
