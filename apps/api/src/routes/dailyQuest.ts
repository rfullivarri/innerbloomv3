import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError, isHttpError } from '../lib/http-error.js';
import { parseWithValidation } from '../lib/validation.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';
import {
  getDailyQuestDefinition,
  getDailyQuestStatus,
  submitDailyQuest,
  type SubmitDailyQuestInput,
  type SubmitDailyQuestLogger,
} from '../services/dailyQuestService.js';

const router = Router();

function createSubmitLogger(reqId: string): SubmitDailyQuestLogger {
  return (level, message, data) => {
    const payload = { reqId, scope: 'dailyQuest.submit', ...(data ?? {}) };
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    logFn(payload, message);
  };
}

const dateQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must use YYYY-MM-DD format')
    .optional(),
});

const submitBodySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Date must use YYYY-MM-DD format')
    .optional(),
  emotion_id: z.coerce.number().int().min(1),
  tasks_done: z
    .array(
      z.object({
        task_id: z.string().uuid({ message: 'task_id must be a valid UUID' }),
      }),
    )
    .default([])
    .transform((entries) => entries.map((entry) => entry.task_id)),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' ? value : null)),
});

router.get(
  '/daily-quest/status',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { date } = parseWithValidation(dateQuerySchema, req.query, 'Invalid date parameter');

    const status = await getDailyQuestStatus(user.id, date);

    res.json(status);
  }),
);

router.get(
  '/daily-quest/definition',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const { date } = parseWithValidation(dateQuerySchema, req.query, 'Invalid date parameter');

    const definition = await getDailyQuestDefinition(user.id, date);

    res.json(definition);
  }),
);

router.post(
  '/daily-quest/submit',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      throw new HttpError(401, 'unauthorized', 'Authentication required');
    }

    const reqId = randomUUID();
    res.locals.requestId = reqId;
    const log = createSubmitLogger(reqId);

    const parsed = parseWithValidation(submitBodySchema, req.body, 'Invalid request body');

    const payload: SubmitDailyQuestInput = {
      date: parsed.date,
      emotion_id: parsed.emotion_id,
      tasks_done: parsed.tasks_done,
      notes: parsed.notes,
    };

    log('info', 'Daily quest submit received', {
      userId: user.id,
      requestedDate: payload.date ?? null,
      tasksCount: payload.tasks_done.length,
      emotionId: payload.emotion_id,
    });

    try {
      const result = await submitDailyQuest(user.id, payload, { requestId: reqId, log });

      log('info', 'Daily quest submit succeeded', {
        userId: user.id,
        resolvedDate: result.saved.emotion.date,
        tasksSelected: result.saved.tasks.completed.length,
        xpDelta: result.xp_delta,
        xpTotalToday: result.xp_total_today,
      });

      res.json(result);
    } catch (error) {
      const pgError = error as { code?: string | number | null; constraint?: string | null };
      const base = {
        userId: user.id,
        requestedDate: payload.date ?? null,
        tasksCount: payload.tasks_done.length,
        emotionId: payload.emotion_id,
        message: error instanceof Error ? error.message : 'Unknown error',
        pgCode: pgError?.code ?? null,
        constraint: pgError?.constraint ?? null,
      };

      if (isHttpError(error)) {
        log('warn', 'Daily quest submit rejected', {
          ...base,
          status: error.status,
          code: error.code,
        });
      } else {
        log('error', 'Daily quest submit failed', base);
      }

      throw error;
    }
  }),
);

export default router;
