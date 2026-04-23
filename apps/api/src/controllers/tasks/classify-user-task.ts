import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';
import { classifyTaskForUser } from '../../services/task-classification.service.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

const bodySchema = z.object({
  title: z
    .string({
      required_error: 'title is required',
      invalid_type_error: 'title must be a string',
    })
    .trim()
    .min(1, 'title is required'),
});

export const classifyUserTask: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { title } = bodySchema.parse(req.body);

  await ensureUserExists(id);

  const classification = await classifyTaskForUser({
    userId: id,
    title,
  });

  res.status(200).json({ classification });
};
