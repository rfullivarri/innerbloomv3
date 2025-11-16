import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';
import { HttpError } from '../../lib/http-error.js';
import { ensureUserExists } from '../users/shared.js';

const paramsSchema = z.object({
  id: uuidSchema,
});

const optionalNumericId = z
  .union([z.coerce.number().int().positive(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) {
      return null;
    }

    return value;
  });

const bodySchema = z.object({
  title: z
    .string({
      required_error: 'title is required',
      invalid_type_error: 'title must be a string',
    })
    .trim()
    .min(1, 'title is required'),
  pillar_id: optionalNumericId,
  trait_id: optionalNumericId,
  stat_id: optionalNumericId,
  difficulty_id: optionalNumericId,
  is_active: z.boolean().optional(),
});

type UserGroupRow = {
  tasks_group_id: string | null;
};

type DifficultyRow = {
  xp_base: number | string | null;
};

type TaskRow = {
  task_id: string;
  user_id: string;
  tasks_group_id: string | null;
  task: string;
  pillar_id: number | string | null;
  trait_id: number | string | null;
  stat_id?: number | string | null;
  difficulty_id: number | string | null;
  xp_base: number | string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
};

type StatColumnResult = {
  exists: boolean;
};

export const createUserTask: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const {
    title,
    pillar_id: pillarId,
    trait_id: traitId,
    stat_id: _statId,
    difficulty_id: difficultyId,
    is_active: isActive,
  } = bodySchema.parse(req.body);

  void _statId;

  await ensureUserExists(id);

  const userResult = await pool.query<UserGroupRow>(
    'SELECT tasks_group_id FROM users WHERE user_id = $1 LIMIT 1',
    [id],
  );

  const userRow = userResult.rows[0];

  if (!userRow?.tasks_group_id) {
    throw new HttpError(400, 'invalid_request', 'User is missing tasks group');
  }

  let xpBase = 0;

  if (difficultyId != null) {
    const difficultyResult = await pool.query<DifficultyRow>(
      'SELECT xp_base FROM cat_difficulty WHERE difficulty_id = $1 LIMIT 1',
      [difficultyId],
    );

    const difficultyRow = difficultyResult.rows[0];
    const resolvedXp = difficultyRow?.xp_base;

    if (resolvedXp != null) {
      const numericXp = Number(resolvedXp);
      xpBase = Number.isFinite(numericXp) ? Math.max(0, Math.round(numericXp)) : 0;
    }
  }

  const statColumnResult = await pool.query<StatColumnResult>(
    `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = $1
          AND column_name = $2
      ) AS exists`,
    ['tasks', 'stat_id'],
  );

  const hasStatColumn = Boolean(statColumnResult.rows[0]?.exists);

  let resolvedStatId = _statId ?? null;
  if (resolvedStatId == null && traitId != null) {
    resolvedStatId = traitId;
  }

  const active = isActive ?? true;
  const taskId = randomUUID();

  const insertColumns = [
    'task_id',
    'user_id',
    'tasks_group_id',
    'task',
    'pillar_id',
    'trait_id',
  ];

  const insertValues: (string | number | boolean | null)[] = [
    taskId,
    id,
    userRow.tasks_group_id,
    title,
    pillarId ?? null,
    traitId ?? null,
  ];

  if (hasStatColumn) {
    insertColumns.push('stat_id');
    insertValues.push(resolvedStatId);
  }

  insertColumns.push('difficulty_id', 'xp_base', 'active');
  insertValues.push(difficultyId ?? null, xpBase, active);

  const returningColumns = [
    'task_id',
    'user_id',
    'tasks_group_id',
    'task',
    'pillar_id',
    'trait_id',
  ];

  if (hasStatColumn) {
    returningColumns.push('stat_id');
  }

  returningColumns.push(
    'difficulty_id',
    'xp_base',
    'active',
    'created_at',
    'updated_at',
    'completed_at',
    'archived_at',
  );

  const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');

  const insertResult = await pool.query<TaskRow>(
    `INSERT INTO tasks (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING ${returningColumns.join(', ')}`,
    insertValues,
  );

  const createdTask = insertResult.rows[0];

  if (!createdTask) {
    throw new HttpError(500, 'internal_error', 'Failed to create task');
  }

  const responseStatId = hasStatColumn
    ? createdTask.stat_id ?? resolvedStatId
    : resolvedStatId;

  res.status(201).json({
    task: {
      ...createdTask,
      stat_id: responseStatId,
    },
  });
};
