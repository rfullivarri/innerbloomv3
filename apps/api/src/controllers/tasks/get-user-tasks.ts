import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { paginationSchema, uuidSchema } from '../../lib/validation.js';
import { ensureUserExists } from '../users/shared.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = paginationSchema;

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

type TaskRow = {
  task_id: string;
  task: string;
  pillar_id: string | null;
  trait_id: string | null;
  difficulty_id: string | null;
  xp_base: number | string;
  active: boolean;
};

export const getUserTasks: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { limit, offset } = querySchema.parse(req.query);

  const finalLimit = limit ?? DEFAULT_LIMIT;
  const finalOffset = offset ?? DEFAULT_OFFSET;

  await ensureUserExists(id);

  const result = await pool.query<TaskRow>(
    `SELECT t.task_id, t.task, t.pillar_id, t.trait_id, t.difficulty_id, t.xp_base, t.active
     FROM tasks t
     JOIN users u ON u.user_id = t.user_id
     WHERE u.user_id = $1
       AND t.tasks_group_id = u.tasks_group_id
       AND t.active = TRUE
     ORDER BY t.created_at ASC
     LIMIT $2 OFFSET $3`,
    [id, finalLimit, finalOffset],
  );

  const tasks = result.rows.map((row: TaskRow) => ({
    task_id: row.task_id,
    task: row.task,
    pillar_id: row.pillar_id,
    trait_id: row.trait_id,
    difficulty_id: row.difficulty_id,
    xp_base: Number(row.xp_base),
    active: row.active,
  }));

  res.json({
    limit: finalLimit,
    offset: finalOffset,
    tasks,
  });
};
