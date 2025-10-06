import { Router } from 'express';
import { z } from 'zod';
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
      throw new HttpError(400, 'invalid_request', 'Invalid request body', parsed.error.flatten());
    }

    res.status(501).json({
      code: 'not_implemented',
      message: 'Task completion tracking is not yet implemented for the reset database.',
    });
  }),
);

export default router;
