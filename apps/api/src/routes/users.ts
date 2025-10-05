import { Router } from 'express';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import {
  dailyStreaks,
  pillars,
  taskLogs,
  tasks,
  traits,
  users,
} from '../db/schema.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

const userParamSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
});

const taskLogsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const emotionsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
});

async function requireUser(userId: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, 'User not found');
  }
}

router.get(
  '/:userId/progress',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);

    await requireUser(userId);

    const progressResult = await db.execute<{
      total_xp: string | number | null;
      level: string | number | null;
      next_level_xp: string | number | null;
      progress_to_next: string | number | null;
    }>(sql`
      SELECT total_xp, level, next_level_xp, progress_to_next
      FROM mv_user_progress
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    const progressRow = progressResult.rows[0];

    const streakRow = await db.query.dailyStreaks.findFirst({
      where: eq(dailyStreaks.userId, userId),
    });

    const totalXp = Number(progressRow?.total_xp ?? 0);
    const level = Number(progressRow?.level ?? 1);
    const nextLevelXp = Number(progressRow?.next_level_xp ?? 0);
    const progressToNext = Number(progressRow?.progress_to_next ?? 0);

    res.json({
      userId,
      totalXp,
      level,
      nextLevelXp,
      progressToNext,
      currentStreak: streakRow?.currentStreak ?? 0,
      longestStreak: streakRow?.longestStreak ?? 0,
    });
  }),
);

router.get(
  '/:userId/tasks',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);

    await requireUser(userId);

    const rows = await db
      .select({
        id: tasks.id,
        name: tasks.name,
        weeklyTarget: tasks.weeklyTarget,
        xp: tasks.xp,
        pillarId: tasks.pillarId,
        pillarName: pillars.name,
        traitId: tasks.traitId,
        traitName: traits.name,
      })
      .from(tasks)
      .innerJoin(pillars, eq(tasks.pillarId, pillars.id))
      .leftJoin(traits, eq(tasks.traitId, traits.id))
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.createdAt));

    res.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        weeklyTarget: row.weeklyTarget,
        xp: row.xp,
        pillar: {
          id: row.pillarId,
          name: row.pillarName,
        },
        trait: row.traitId
          ? {
              id: row.traitId,
              name: row.traitName ?? '',
            }
          : null,
      })),
    );
  }),
);

router.get(
  '/:userId/task-logs',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);
    const { limit } = taskLogsQuerySchema.parse(req.query);

    await requireUser(userId);

    const finalLimit = limit ?? 20;

    const rows = await db
      .select({
        id: taskLogs.id,
        taskId: taskLogs.taskId,
        taskName: tasks.name,
        doneAt: taskLogs.doneAt,
      })
      .from(taskLogs)
      .innerJoin(tasks, eq(taskLogs.taskId, tasks.id))
      .where(eq(taskLogs.userId, userId))
      .orderBy(desc(taskLogs.doneAt))
      .limit(finalLimit);

    res.json(
      rows.map((row) => ({
        id: row.id,
        taskId: row.taskId,
        taskName: row.taskName,
        doneAt: row.doneAt.toISOString(),
      })),
    );
  }),
);

router.get(
  '/:userId/streaks',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);

    await requireUser(userId);

    const streakResult = await db.execute<{
      task_id: string;
      task_name: string | null;
      c1s_current: string | number | null;
      c2s_current: string | number | null;
      c3s_current: string | number | null;
      c4s_current: string | number | null;
      c1s_max: string | number | null;
      c2s_max: string | number | null;
      c3s_max: string | number | null;
      c4s_max: string | number | null;
    }>(sql`
      SELECT
        t.id AS task_id,
        t.name AS task_name,
        COALESCE(actual.c1s_actual, 0) AS c1s_current,
        COALESCE(actual.c2s_actual, 0) AS c2s_current,
        COALESCE(actual.c3s_actual, 0) AS c3s_current,
        COALESCE(actual.c4s_actual, 0) AS c4s_current,
        COALESCE(max.c1s_max, 0) AS c1s_max,
        COALESCE(max.c2s_max, 0) AS c2s_max,
        COALESCE(max.c3s_max, 0) AS c3s_max,
        COALESCE(max.c4s_max, 0) AS c4s_max
      FROM tasks t
      LEFT JOIN v_task_streaks_actual actual
        ON actual.user_id = t.user_id AND actual.task_id = t.id
      LEFT JOIN v_task_streaks_max max
        ON max.user_id = t.user_id AND max.task_id = t.id
      WHERE t.user_id = ${userId}
      ORDER BY t.name
    `);

    res.json(
      streakResult.rows.map((row) => ({
        taskId: row.task_id,
        taskName: row.task_name ?? '',
        current: {
          c1s: Number(row.c1s_current ?? 0),
          c2s: Number(row.c2s_current ?? 0),
          c3s: Number(row.c3s_current ?? 0),
          c4s: Number(row.c4s_current ?? 0),
        },
        longest: {
          c1s: Number(row.c1s_max ?? 0),
          c2s: Number(row.c2s_max ?? 0),
          c3s: Number(row.c3s_max ?? 0),
          c4s: Number(row.c4s_max ?? 0),
        },
      })),
    );
  }),
);

router.get(
  '/:userId/emotions',
  asyncHandler(async (req, res) => {
    const { userId } = userParamSchema.parse(req.params);
    const { days } = emotionsQuerySchema.parse(req.query);

    await requireUser(userId);

    const range = days ?? 30;

    // TODO: replace stub when emotion tracking schema is available
    res.json({
      userId,
      days: range,
      entries: [],
    });
  }),
);

export default router;
