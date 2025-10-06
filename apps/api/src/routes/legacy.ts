import { Router } from 'express';
import { z } from 'zod';
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

router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const parsed = tasksQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'invalid_request', 'Invalid query parameters', parsed.error.flatten());
    }

    res.json([]);
  }),
);

router.get(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = taskLogsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'invalid_request', 'Invalid query parameters', parsed.error.flatten());
    }

    res.json([]);
  }),
);

router.post(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = createTaskLogSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, 'invalid_request', 'Invalid request body', parsed.error.flatten());
    }

    res.status(501).json({
      code: 'not_implemented',
      message: 'Legacy task logging is not available for the reset database.',
    });
  }),
);

export default router;
