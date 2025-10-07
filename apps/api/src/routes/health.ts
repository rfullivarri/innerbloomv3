import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { pool } from '../db.js';

const router = Router();

router.get(
  '/_health',
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  }),
);

router.get(
  '/health/db',
  asyncHandler(async (_req, res) => {
    try {
      await pool.query('select 1');
      res.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to reach the database';
      res.status(500).json({ code: 'database_unavailable', message });
    }
  }),
);

export default router;
