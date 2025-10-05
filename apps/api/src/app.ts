import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { eq, sql as drizzleSql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './db/client.js';
import {
  pillars,
  stats,
  taskLogs,
  tasks,
  traits,
  users,
} from './db/schema.js';

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

const tasksQuerySchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const createTaskLogSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  taskId: z.string().uuid({ message: 'taskId must be a valid UUID' }),
  doneAt: z.coerce.date({ message: 'doneAt must be a date or ISO string' }),
});

export function createApp() {
  const app = express();

  // Allow our friends (the frontend) to talk to us.
  app.use(cors());
  // Teach Express to understand JSON payloads.
  app.use(express.json());

  app.get(
    '/health/db',
    asyncHandler(async (_req, res) => {
      await db.execute(drizzleSql`select 1`);
      res.json({ ok: true });
    }),
  );

  app.get(
    '/pillars',
    asyncHandler(async (_req, res) => {
      const rows = await db
        .select({
          id: pillars.id,
          name: pillars.name,
          description: pillars.description,
          createdAt: pillars.createdAt,
          updatedAt: pillars.updatedAt,
          traitCount: drizzleSql<number>`COUNT(DISTINCT ${traits.id})`,
          statCount: drizzleSql<number>`COUNT(DISTINCT ${stats.id})`,
        })
        .from(pillars)
        .leftJoin(traits, eq(traits.pillarId, pillars.id))
        .leftJoin(stats, eq(stats.traitId, traits.id))
        .groupBy(
          pillars.id,
          pillars.name,
          pillars.description,
          pillars.createdAt,
          pillars.updatedAt,
        )
        .orderBy(pillars.name);

      const payload = rows.map((row) => ({
        ...row,
        traitCount: Number(row.traitCount),
        statCount: Number(row.statCount),
      }));

      res.json(payload);
    }),
  );

  app.get(
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
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          pillarId: tasks.pillarId,
          pillarName: pillars.name,
          traitId: tasks.traitId,
          traitName: traits.name,
          statId: tasks.statId,
          statName: stats.name,
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
          lastCompletedAt: drizzleSql<Date | null>`MAX(${taskLogs.doneAt})`,
        })
        .from(taskLogs)
        .where(eq(taskLogs.userId, userId))
        .groupBy(taskLogs.taskId);

      const lastCompletedMap = new Map<string, Date | null>();
      for (const row of taskLogRows) {
        const value = row.lastCompletedAt ? new Date(row.lastCompletedAt) : null;
        lastCompletedMap.set(row.taskId, value);
      }

      const payload = taskRows.map((task) => ({
        ...task,
        lastCompletedAt: lastCompletedMap.get(task.id)?.toISOString() ?? null,
      }));

      res.json(payload);
    }),
  );

  app.post(
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

  app.use((_req, _res, next) => {
    next(new HttpError(404, 'Route not found'));
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        error: {
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: error.flatten(),
        },
      });
    }

    console.error('Unexpected error', error);

    return res.status(500).json({
      error: {
        message: 'Something went wrong',
      },
    });
  });

  return app;
}
