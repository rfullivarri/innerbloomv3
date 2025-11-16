import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';
import { updateUserTaskRow, type UpdateUserTaskPayload } from '../../services/user-tasks.service.js';

const paramsSchema = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
});

const optionalNumericId = z.union([z.coerce.number().int().positive(), z.null()]).optional();

const bodySchema = z
  .object({
    title: z
      .string({
        invalid_type_error: 'title must be a string',
      })
      .trim()
      .min(1, 'title is required')
      .optional(),
    pillar_id: optionalNumericId,
    trait_id: optionalNumericId,
    stat_id: optionalNumericId,
    difficulty_id: optionalNumericId,
    is_active: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const keys: (keyof UpdateUserTaskPayload)[] = [
      'title',
      'pillar_id',
      'trait_id',
      'stat_id',
      'difficulty_id',
      'is_active',
    ];

    const hasAny = keys.some((key) => key in value);
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one property must be provided',
        path: [],
      });
    }
  });

export const updateUserTask: AsyncHandler = async (req, res) => {
  const { id, taskId } = paramsSchema.parse(req.params);
  const body = bodySchema.parse(req.body);

  await ensureUserExists(id);

  const task = await updateUserTaskRow(id, taskId, body);

  res.json({ task });
};
