import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';
import { deleteUserTaskRow } from '../../services/user-tasks.service.js';

const paramsSchema = z.object({
  id: uuidSchema,
  taskId: uuidSchema,
});

export const deleteUserTask: AsyncHandler = async (req, res) => {
  const { id, taskId } = paramsSchema.parse(req.params);

  await ensureUserExists(id);
  await deleteUserTaskRow(id, taskId);

  res.status(204).end();
};
