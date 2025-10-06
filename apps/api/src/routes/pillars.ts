import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get(
  '/pillars',
  asyncHandler(async (_req, res) => {
    res.json([]);
  }),
);

export default router;
