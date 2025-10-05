import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

const completeTaskSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  taskId: z.string().uuid({ message: 'taskId must be a valid UUID' }),
  doneAt: z.coerce.date().optional(),
});

router.post(
  '/tasks/complete',
  asyncHandler(async (req, res) => {
    const parsed = completeTaskSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body', parsed.error.flatten());
    }

    await db.execute(sql`select 1`);

    res.status(501).json({
      ok: false,
      message: 'Task completion tracking is not yet implemented for the reset database.',
    });
  }),
);

export default router;
