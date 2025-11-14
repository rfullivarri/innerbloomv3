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
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .optional(),
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
  notes?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  archived_at?: string | null;
};

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const createUserTask: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const {
    title,
    pillar_id: pillarId,
    trait_id: traitId,
    stat_id: statId,
    difficulty_id: difficultyId,
    notes: notesInput,
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
  const normalizedNotes = normalizeNotes(notesInput);
  const resolvedStatId = statId != null ? statId : traitId != null ? traitId : null;

  const insertResult = await pool.query<TaskRow>(
    `INSERT INTO tasks (
       task_id,
       user_id,
       tasks_group_id,
       task,
       pillar_id,
       trait_id,
       stat_id,
       difficulty_id,
       xp_base,
       notes,
       active
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING
       task_id,
       user_id,
       tasks_group_id,
       task,
       pillar_id,
       trait_id,
       stat_id,
       difficulty_id,
       xp_base,
       notes,
       active,
       created_at,
       updated_at,
       completed_at,
       archived_at`,
    [
      taskId,
      id,
      userRow.tasks_group_id,
      title,
      pillarId,
      traitId,
      resolvedStatId,
      difficultyId,
      xpBase,
      normalizedNotes,
      active,
    ],
  );

  const createdTask = insertResult.rows[0];

  if (!createdTask) {
    throw new HttpError(500, 'internal_error', 'Failed to create task');
  }

  res.status(201).json({
    task: {
      ...createdTask,
      notes: normalizeNotes(createdTask.notes),
    },
  });
};
