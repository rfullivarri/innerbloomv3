import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

const userParamSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const taskLogsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const emotionsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
});

async function ensureDatabaseConnection() {
  await db.execute(sql`select 1`);
}

router.get(
  '/:userId/progress',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);

    await ensureDatabaseConnection();

    res.json({
      userId,
      totalXp: 0,
      level: 1,
      nextLevelXp: 0,
      progressToNext: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  }),
);

router.get(
  '/:userId/tasks',
  asyncHandler(async (req, res) => {
    userParamSchema.parse(req.params);

    await ensureDatabaseConnection();

    res.json([]);
  }),
);

router.get(
  '/:userId/task-logs',
  asyncHandler(async (req, res) => {
    userParamSchema.parse(req.params);
    taskLogsQuerySchema.parse(req.query);

    await ensureDatabaseConnection();

    res.json([]);
  }),
);

router.get(
  '/:userId/streaks',
  asyncHandler(async (req, res) => {
    userParamSchema.parse(req.params);

    await ensureDatabaseConnection();

    res.json([]);
  }),
);

router.get(
  '/:userId/emotions',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);
    const { days } = emotionsQuerySchema.parse(req.query);

    await ensureDatabaseConnection();

    const range = days ?? 30;

    res.json({
      userId,
      days: range,
      entries: [],
    });
  }),
);

export default router;
