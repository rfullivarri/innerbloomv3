import { randomUUID } from 'node:crypto';
import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

const optionalColumns = ['stat_id', 'completed_at', 'archived_at'] as const;
type OptionalTaskColumn = (typeof optionalColumns)[number];

type TaskColumnRow = {
  column_name: OptionalTaskColumn;
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
  lifecycle_status?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  archived_at?: string | null;
};

export type UpdateUserTaskPayload = {
  title?: string;
  pillar_id?: number | null;
  trait_id?: number | null;
  stat_id?: number | null;
  difficulty_id?: number | null;
  is_active?: boolean;
};

export async function deleteUserTaskRow(userId: string, taskId: string): Promise<void> {
  const columnResult = await pool.query<TaskColumnRow>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = ANY($2::text[])`,
    ['tasks', optionalColumns],
  );

  const existingColumns = new Set(columnResult.rows.map((row) => row.column_name));
  const hasArchivedColumn = existingColumns.has('archived_at');

  const setClauses = ['active = FALSE', 'updated_at = NOW()'];

  if (hasArchivedColumn) {
    setClauses.unshift('archived_at = COALESCE(archived_at, NOW())');
  }

  const result = await pool.query<{ task_id: string }>(
    `UPDATE tasks t
        SET ${setClauses.join(', ')}
      FROM users u
     WHERE t.task_id = $1
       AND t.user_id = $2
       AND u.user_id = $2
       AND t.tasks_group_id = u.tasks_group_id
     RETURNING t.task_id`,
    [taskId, userId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'task_not_found', 'Task not found');
  }
}

function hasUpdate(payload: UpdateUserTaskPayload): boolean {
  const keys: (keyof UpdateUserTaskPayload)[] = [
    'title',
    'pillar_id',
    'trait_id',
    'stat_id',
    'difficulty_id',
    'is_active',
  ];

  return keys.some((key) => key in payload);
}

async function resolveXpBase(difficultyId: number | null | undefined): Promise<number> {
  if (difficultyId == null) {
    return 0;
  }

  const result = await pool.query<DifficultyRow>(
    'SELECT xp_base FROM cat_difficulty WHERE difficulty_id = $1 LIMIT 1',
    [difficultyId],
  );

  const raw = result.rows[0]?.xp_base;

  if (raw == null) {
    return 0;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
}

const emptyUpdateMessage = 'At least one property must be provided';
const EDIT_CONTINUITY_DAYS = 35;

function shouldCloneTaskOnEdit(createdAt: string, lifecycleStatus: string | null | undefined, now: Date): boolean {
  if (lifecycleStatus !== 'achievement_maintained') {
    return false;
  }

  const created = new Date(createdAt);
  const boundary = new Date(created.getTime());
  boundary.setUTCDate(boundary.getUTCDate() + EDIT_CONTINUITY_DAYS);
  return now.getTime() >= boundary.getTime();
}

export async function updateUserTaskRow(
  userId: string,
  taskId: string,
  payload: UpdateUserTaskPayload,
): Promise<TaskRow> {
  if (!hasUpdate(payload)) {
    throw new HttpError(400, 'invalid_request', emptyUpdateMessage);
  }

  const columnResult = await pool.query<TaskColumnRow>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_name = $1
        AND column_name = ANY($2::text[])`,
    ['tasks', optionalColumns],
  );

  const existingColumns = new Set(columnResult.rows.map((row) => row.column_name));
  const hasStatColumn = existingColumns.has('stat_id');
  const hasCompletedColumn = existingColumns.has('completed_at');
  const hasArchivedColumn = existingColumns.has('archived_at');

  const returningColumns = [
    'task_id',
    'user_id',
    'tasks_group_id',
    'task',
    'pillar_id',
    'trait_id',
    'difficulty_id',
    'xp_base',
    'active',
    'lifecycle_status',
    'created_at',
    'updated_at',
  ];

  if (hasStatColumn) {
    returningColumns.push('stat_id');
  }
  if (hasCompletedColumn) {
    returningColumns.push('completed_at');
  }
  if (hasArchivedColumn) {
    returningColumns.push('archived_at');
  }

  const existingResult = await pool.query<TaskRow>(
    `SELECT ${returningColumns.join(', ')}
       FROM tasks
      WHERE task_id = $1
        AND user_id = $2
      LIMIT 1`,
    [taskId, userId],
  );

  const currentTask = existingResult.rows[0];

  if (!currentTask) {
    throw new HttpError(404, 'task_not_found', 'Task not found');
  }

  const shouldClone = shouldCloneTaskOnEdit(currentTask.created_at, currentTask.lifecycle_status, new Date());
  if (shouldClone) {
    const nextTaskId = randomUUID();
    const nextTitle = payload.title ?? currentTask.task;
    const nextPillarId = 'pillar_id' in payload ? payload.pillar_id ?? null : currentTask.pillar_id;
    const nextTraitId = 'trait_id' in payload ? payload.trait_id ?? null : currentTask.trait_id;
    const nextDifficultyId = 'difficulty_id' in payload ? payload.difficulty_id ?? null : currentTask.difficulty_id;
    const nextXpBase = 'difficulty_id' in payload
      ? await resolveXpBase(payload.difficulty_id ?? null)
      : Number(currentTask.xp_base ?? 0);
    const nextActive = payload.is_active ?? true;
    const nextLifecycleStatus = 'active';
    const nextStatId = hasStatColumn
      ? ('stat_id' in payload ? payload.stat_id ?? null : currentTask.stat_id ?? null)
      : null;

    await pool.query('BEGIN');
    try {
      const deactivateClauses = ['active = FALSE', 'updated_at = NOW()'];
      if (hasArchivedColumn) {
        deactivateClauses.unshift('archived_at = COALESCE(archived_at, NOW())');
      }

      await pool.query(
        `UPDATE tasks
            SET ${deactivateClauses.join(', ')}
          WHERE task_id = $1
            AND user_id = $2`,
        [taskId, userId],
      );

      const insertColumns = [
        'task_id',
        'user_id',
        'tasks_group_id',
        'task',
        'pillar_id',
        'trait_id',
      ];
      const insertValues: (string | number | boolean | null)[] = [
        nextTaskId,
        userId,
        currentTask.tasks_group_id,
        nextTitle,
        Number(nextPillarId ?? 0) || null,
        Number(nextTraitId ?? 0) || null,
      ];

      if (hasStatColumn) {
        insertColumns.push('stat_id');
        insertValues.push(nextStatId == null ? null : Number(nextStatId));
      }

      insertColumns.push('difficulty_id', 'xp_base', 'active', 'lifecycle_status');
      insertValues.push(nextDifficultyId == null ? null : Number(nextDifficultyId), nextXpBase, nextActive, nextLifecycleStatus);

      const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
      const insertResult = await pool.query<TaskRow>(
        `INSERT INTO tasks (${insertColumns.join(', ')})
         VALUES (${placeholders})
         RETURNING ${returningColumns.join(', ')}`,
        insertValues,
      );

      await pool.query('COMMIT');
      const createdTask = insertResult.rows[0];
      if (!createdTask) {
        throw new HttpError(500, 'internal_error', 'Failed to clone task');
      }

      await pool.query(
        `UPDATE users
            SET first_tasks_confirmed = TRUE,
                first_tasks_confirmed_at = COALESCE(first_tasks_confirmed_at, NOW()),
                updated_at = NOW()
          WHERE user_id = $1
            AND first_tasks_confirmed = FALSE`,
        [userId],
      );

      return {
        ...createdTask,
        stat_id: hasStatColumn ? createdTask.stat_id ?? null : null,
        completed_at: hasCompletedColumn ? createdTask.completed_at ?? null : null,
        archived_at: hasArchivedColumn ? createdTask.archived_at ?? null : null,
      } satisfies TaskRow;
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  const pushUpdate = (column: string, value: string | number | boolean | null): void => {
    updates.push(`${column} = $${values.length + 1}`);
    values.push(value);
  };

  if ('title' in payload) {
    pushUpdate('task', payload.title ?? currentTask.task);
  }
  if ('pillar_id' in payload) {
    pushUpdate('pillar_id', payload.pillar_id ?? null);
  }
  if ('trait_id' in payload) {
    pushUpdate('trait_id', payload.trait_id ?? null);
  }
  if (hasStatColumn && 'stat_id' in payload) {
    pushUpdate('stat_id', payload.stat_id ?? null);
  }

  let resolvedXpBase: number | null = null;
  if ('difficulty_id' in payload) {
    pushUpdate('difficulty_id', payload.difficulty_id ?? null);
    resolvedXpBase = await resolveXpBase(payload.difficulty_id ?? null);
    pushUpdate('xp_base', resolvedXpBase);
  }

  if ('is_active' in payload) {
    pushUpdate('active', payload.is_active ?? false);
  }

  if (updates.length === 0) {
    throw new HttpError(400, 'invalid_request', 'No valid task fields were provided');
  }

  const taskIdParam = values.length + 1;
  const userIdParam = values.length + 2;

  const updateResult = await pool.query<TaskRow>(
    `UPDATE tasks
        SET ${[...updates, 'updated_at = NOW()'].join(', ')}
      WHERE task_id = $${taskIdParam}
        AND user_id = $${userIdParam}
      RETURNING ${returningColumns.join(', ')}`,
    [...values, taskId, userId],
  );

  const updatedTask = updateResult.rows[0];
  if (!updatedTask) {
    throw new HttpError(500, 'internal_error', 'Failed to update task');
  }

  await pool.query(
    `UPDATE users
        SET first_tasks_confirmed = TRUE,
            first_tasks_confirmed_at = COALESCE(first_tasks_confirmed_at, NOW()),
            updated_at = NOW()
      WHERE user_id = $1
        AND first_tasks_confirmed = FALSE`,
    [userId],
  );

  return {
    ...updatedTask,
    stat_id: hasStatColumn ? updatedTask.stat_id ?? null : null,
    completed_at: hasCompletedColumn ? updatedTask.completed_at ?? null : null,
    archived_at: hasArchivedColumn ? updatedTask.archived_at ?? null : null,
    xp_base:
      resolvedXpBase != null
        ? resolvedXpBase
        : updatedTask.xp_base ?? currentTask.xp_base ?? null,
  } satisfies TaskRow;
}
