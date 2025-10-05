import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

router.get(
  '/health/db',
  asyncHandler(async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      res.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach the database';
      res.status(500).json({ ok: false, error: message });
    }
  }),
);

export default router;
