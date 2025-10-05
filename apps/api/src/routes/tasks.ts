import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { taskLogs, tasks } from '../db/schema.js';
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

    const { userId, taskId } = parsed.data;
    const doneAt = parsed.data.doneAt ?? new Date();

    const [task] = await db
      .select({ id: tasks.id, ownerId: tasks.userId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new HttpError(404, 'Task not found');
    }

    if (task.ownerId !== userId) {
      throw new HttpError(403, 'Task does not belong to this user');
    }

    const [inserted] = await db
      .insert(taskLogs)
      .values({
        taskId,
        userId,
        doneAt,
      })
      .returning({ id: taskLogs.id });

    res.status(201).json({ ok: true, id: inserted.id });
  }),
);

export default router;
