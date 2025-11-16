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

type ColumnExistsRow = {
  exists: boolean | string | number | null;
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
  completed_at?: string | null;
  archived_at?: string | null;
};

async function supportsTasksStatIdColumn(): Promise<boolean> {
  try {
    const result = await pool.query<ColumnExistsRow>(
      `SELECT EXISTS (
         SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
            AND column_name = $2
       ) AS exists`,
      ['tasks', 'stat_id'],
    );

    const rawValue = result.rows[0]?.exists;

    if (typeof rawValue === 'boolean') {
      return rawValue;
    }

    if (rawValue == null) {
      return false;
    }

    if (typeof rawValue === 'number') {
      return rawValue === 1;
    }

    if (typeof rawValue === 'string') {
      return rawValue === 't' || rawValue === 'true' || rawValue === '1';
    }

    return false;
  } catch (error) {
    console.error('Failed to verify tasks.stat_id column, defaulting to false', error);
    return false;
  }
}

export const createUserTask: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const {
    title,
    pillar_id: pillarId,
    trait_id: traitId,
    stat_id: statId,
    difficulty_id: difficultyId,
    is_active: isActive,
  } = bodySchema.parse(req.body);

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

  const active = isActive ?? true;
  const taskId = randomUUID();
  const resolvedStatId = statId != null ? statId : traitId != null ? traitId : null;

  const supportsStatId = await supportsTasksStatIdColumn();

  const insertColumns = [
    'task_id',
    'user_id',
    'tasks_group_id',
    'task',
    'pillar_id',
    'trait_id',
    ...(supportsStatId ? ['stat_id'] : []),
    'difficulty_id',
    'xp_base',
    'active',
  ];

  const returningColumns = [
    'task_id',
    'user_id',
    'tasks_group_id',
    'task',
    'pillar_id',
    'trait_id',
    ...(supportsStatId ? ['stat_id'] : []),
    'difficulty_id',
    'xp_base',
    'active',
    'created_at',
    'updated_at',
    'completed_at',
    'archived_at',
  ];

  const values: unknown[] = supportsStatId
    ? [
        taskId,
        id,
        userRow.tasks_group_id,
        title,
        pillarId,
        traitId,
        resolvedStatId,
        difficultyId,
        xpBase,
        active,
      ]
    : [
        taskId,
        id,
        userRow.tasks_group_id,
        title,
        pillarId,
        traitId,
        difficultyId,
        xpBase,
        active,
      ];

  const placeholders = insertColumns
    .map((_, index) => `$${index + 1}`)
    .join(', ');

  const insertResult = await pool.query<TaskRow>(
    `INSERT INTO tasks (${insertColumns.join(', ')})
     VALUES (${placeholders})
     RETURNING ${returningColumns.join(', ')}`,
    values,
  );

  const createdTask = insertResult.rows[0]
    ? supportsStatId
      ? insertResult.rows[0]
      : { ...insertResult.rows[0], stat_id: resolvedStatId }
    : undefined;

  if (!createdTask) {
    throw new HttpError(500, 'internal_error', 'Failed to create task');
  }

  res.status(201).json({
    task: {
      ...createdTask,
    },
  });
};
