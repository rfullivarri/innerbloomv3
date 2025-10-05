import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

const tasksQuerySchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const taskLogsQuerySchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const createTaskLogSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  taskId: z.string().uuid({ message: 'taskId must be a valid UUID' }),
  doneAt: z.coerce.date({ message: 'doneAt must be a date or ISO string' }),
});

async function ensureDatabaseConnection() {
  await db.execute(sql`select 1`);
}

router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const parsed = tasksQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid query parameters', parsed.error.flatten());
    }

    await ensureDatabaseConnection();

    res.json([]);
  }),
);

router.get(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = taskLogsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid query parameters', parsed.error.flatten());
    }

    await ensureDatabaseConnection();

    res.json([]);
  }),
);

router.post(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = createTaskLogSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body', parsed.error.flatten());
    }

    await ensureDatabaseConnection();

    res.status(501).json({
      ok: false,
      message: 'Legacy task logging is not available for the reset database.',
    });
  }),
);

export default router;
