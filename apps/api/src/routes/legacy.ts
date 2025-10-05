import { Router } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  pillars,
  stats,
  taskLogs,
  tasks,
  traits,
  users,
} from '../db/schema.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

const tasksQuerySchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const taskLogsQuerySchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const createTaskLogSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  taskId: z.string().uuid({ message: 'taskId must be a valid UUID' }),
  doneAt: z.coerce.date({ message: 'doneAt must be a date or ISO string' }),
});

const LEGACY_LOG_LIMIT = 20;

router.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const parsed = tasksQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid query parameters', parsed.error.flatten());
    }

    const { userId } = parsed.data;

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new HttpError(404, 'User not found');
    }

    const taskRows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        pillarId: tasks.pillarId,
        pillarName: pillars.name,
        traitId: tasks.traitId,
        traitName: traits.name,
        statId: tasks.statId,
        statName: stats.name,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .innerJoin(pillars, eq(tasks.pillarId, pillars.id))
      .leftJoin(traits, eq(tasks.traitId, traits.id))
      .leftJoin(stats, eq(tasks.statId, stats.id))
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt);

    const taskLogRows = await db
      .select({
        taskId: taskLogs.taskId,
        lastCompletedAt: sql<Date | null>`MAX(${taskLogs.doneAt})`,
      })
      .from(taskLogs)
      .where(eq(taskLogs.userId, userId))
      .groupBy(taskLogs.taskId);

    const lastCompletedMap = new Map<string, Date | null>();
    for (const row of taskLogRows) {
      lastCompletedMap.set(
        row.taskId,
        row.lastCompletedAt ? new Date(row.lastCompletedAt) : null,
      );
    }

    const payload = taskRows.map((task) => ({
      ...task,
      lastCompletedAt: lastCompletedMap.get(task.id)?.toISOString() ?? null,
      pillar_id: task.pillarId,
      trait_id: task.traitId,
      stat_id: task.statId,
    }));

    res.json(payload);
  }),
);

router.get(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = taskLogsQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid query parameters', parsed.error.flatten());
    }

    const { userId } = parsed.data;

    const rows = await db
      .select({
        id: taskLogs.id,
        taskId: taskLogs.taskId,
        taskTitle: tasks.title,
        doneAt: taskLogs.doneAt,
      })
      .from(taskLogs)
      .innerJoin(tasks, eq(taskLogs.taskId, tasks.id))
      .where(eq(taskLogs.userId, userId))
      .orderBy(desc(taskLogs.doneAt))
      .limit(LEGACY_LOG_LIMIT);

    const payload = rows.map((row) => ({
      id: row.id,
      taskId: row.taskId,
      taskTitle: row.taskTitle,
      doneAt: row.doneAt.toISOString(),
    }));

    res.json(payload);
  }),
);

router.post(
  '/task-logs',
  asyncHandler(async (req, res) => {
    const parsed = createTaskLogSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, 'Invalid request body', parsed.error.flatten());
    }

    const { userId, taskId, doneAt } = parsed.data;

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

    const inserted = await db
      .insert(taskLogs)
      .values({
        taskId,
        userId,
        doneAt,
      })
      .returning();

    res.status(201).json({ taskLog: inserted[0] });
  }),
);

export default router;
