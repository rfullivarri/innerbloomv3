import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';
import { pool } from '../db.js';
import { parseWithValidation, uuidSchema } from '../lib/validation.js';
import { authMiddleware } from '../middlewares/auth-middleware.js';

const router = Router();

const completeTaskSchema = z.object({
  userId: z.string().uuid({ message: 'userId must be a valid UUID' }),
  taskId: z.string().uuid({ message: 'taskId must be a valid UUID' }),
  doneAt: z.coerce.date().optional(),
});

router.post(
  '/tasks/complete',
  asyncHandler(async (req, res) => {
    const parsed = completeTaskSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, 'invalid_request', 'Invalid request body');
    }

    res.status(501).json({
      code: 'not_implemented',
      message: 'Task completion tracking is not yet implemented for the reset database.',
    });
  }),
);

type Mode = 'Low' | 'Chill' | 'Flow' | 'Evolve';

const MODE_TIERS: Record<Mode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

const MAX_WEEKS = 12;

const insightsParamsSchema = z.object({
  taskId: uuidSchema,
});

const insightsQuerySchema = z.object({
  mode: z.string().optional(),
  weeklyGoal: z.coerce.number().int().min(1).max(99).optional(),
});

type InsightsTaskRow = {
  task_id: string;
  user_id: string;
  task: string;
  xp_base: number | string | null;
  trait_name: string | null;
  trait_code: string | null;
  timezone: string | null;
  today: string | null;
};

type InsightLogRow = {
  date: string;
  count: number | string | null;
};

type InsightsResponse = {
  task: {
    id: string;
    name: string;
    stat: string | null;
    description: null;
  };
  month: {
    totalCount: number;
    days: Array<{ date: string; count: number }>;
  };
  weeks: {
    weeklyGoal: number;
    completionRate: number;
    currentStreak: number;
    bestStreak: number;
    timeline: Array<{ weekStart: string; weekEnd: string; count: number; hit: boolean }>;
  };
};

function normalizeMode(value: string | null | undefined): Mode {
  if (!value) return 'Flow';
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'low':
      return 'Low';
    case 'chill':
      return 'Chill';
    case 'evolve':
    case 'evol':
      return 'Evolve';
    default:
      return 'Flow';
  }
}

function parseDate(value: string | null | undefined): Date {
  if (!value) return new Date();
  const trimmed = value.trim();
  const parts = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (parts) {
    const year = Number(parts[1]);
    const month = Number(parts[2]) - 1;
    const day = Number(parts[3]);
    return new Date(Date.UTC(year, month, day));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number): Date {
  const clone = new Date(date.getTime());
  clone.setUTCDate(clone.getUTCDate() + amount);
  return clone;
}

function addMonths(date: Date, amount: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function startOfWeek(date: Date): Date {
  const clone = new Date(date.getTime());
  const day = clone.getUTCDay();
  const diff = (day + 6) % 7;
  clone.setUTCHours(0, 0, 0, 0);
  clone.setUTCDate(clone.getUTCDate() - diff);
  return clone;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function sumCountsInRange(logs: Map<string, number>, start: Date, endExclusive: Date): number {
  let total = 0;
  for (let cursor = start; cursor < endExclusive; cursor = addDays(cursor, 1)) {
    const key = formatDate(cursor);
    total += logs.get(key) ?? 0;
  }
  return total;
}

function computeStreaks(hits: boolean[]): { current: number; best: number } {
  let current = 0;
  let best = 0;
  let running = 0;

  for (const hit of hits) {
    if (hit) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 0;
    }
  }

  for (let i = hits.length - 1; i >= 0; i -= 1) {
    if (hits[i]) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, best };
}

router.get(
  '/tasks/:taskId/insights',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { taskId } = parseWithValidation(insightsParamsSchema, req.params);
    const { mode: rawMode, weeklyGoal: weeklyGoalParam } = parseWithValidation(insightsQuerySchema, req.query);

    const mode = normalizeMode(rawMode);
    const weeklyGoal = weeklyGoalParam && weeklyGoalParam > 0 ? weeklyGoalParam : MODE_TIERS[mode];

    const taskResult = await pool.query<InsightsTaskRow>(
      `SELECT t.task_id,
              t.user_id,
              t.task,
              t.xp_base,
              ct.name AS trait_name,
              ct.code AS trait_code,
              u.timezone,
              timezone(COALESCE(u.timezone, 'UTC'), now())::date::text AS today
         FROM tasks t
         JOIN users u ON u.user_id = t.user_id
    LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
        WHERE t.task_id = $1
          AND t.active = TRUE
        LIMIT 1`,
      [taskId],
    );

    const taskRow = taskResult.rows[0];

    if (!taskRow || taskRow.user_id !== req.user?.id) {
      throw new HttpError(404, 'not_found', 'Task not found');
    }

    const ownerId = taskRow.user_id;
    const timezone = taskRow.timezone ?? 'UTC';
    const today = parseDate(taskRow.today ?? undefined);
    const currentWeekStart = startOfWeek(today);
    const currentWeekEndExclusive = addDays(currentWeekStart, 7);
    const monthStart = startOfMonth(today);
    const monthEndExclusive = addMonths(monthStart, 1);
    const windowStart = addDays(currentWeekStart, -(MAX_WEEKS - 1) * 7);
    const logsFrom = formatDate(windowStart < monthStart ? windowStart : monthStart);
    const logsTo = formatDate(addDays(currentWeekEndExclusive, -1));

    const logResult = await pool.query<InsightLogRow>(
      `SELECT date::text AS date, SUM(quantity) AS count
         FROM daily_log
        WHERE task_id = $1
          AND user_id = $2
          AND date BETWEEN $3 AND $4
        GROUP BY date`,
      [taskId, ownerId, logsFrom, logsTo],
    );

    const dayCounts = logResult.rows.reduce((map, row) => {
      const normalized = Number(row.count ?? 0);
      map.set(row.date, Number.isFinite(normalized) ? normalized : 0);
      return map;
    }, new Map<string, number>());

    const monthDays: Array<{ date: string; count: number }> = [];
    let monthTotal = 0;
    for (let cursor = monthStart; cursor < monthEndExclusive; cursor = addDays(cursor, 1)) {
      const key = formatDate(cursor);
      const count = dayCounts.get(key) ?? 0;
      monthTotal += count;
      monthDays.push({ date: key, count });
    }

    const timeline: InsightsResponse['weeks']['timeline'] = [];
    for (let cursor = windowStart; cursor < currentWeekEndExclusive; cursor = addDays(cursor, 7)) {
      const weekStart = cursor;
      const weekEnd = addDays(weekStart, 7);
      const count = sumCountsInRange(dayCounts, weekStart, weekEnd);
      timeline.push({
        weekStart: formatDate(weekStart),
        weekEnd: formatDate(addDays(weekEnd, -1)),
        count,
        hit: count >= weeklyGoal,
      });
    }

    const totalWeeks = timeline.length || 1;
    const completedWeeks = timeline.filter((week) => week.hit).length;
    const completionRate = Math.round((completedWeeks / totalWeeks) * 100);
    const streaks = computeStreaks(timeline.map((entry) => entry.hit));

    const response: InsightsResponse = {
      task: {
        id: taskRow.task_id,
        name: taskRow.task,
        stat: taskRow.trait_name ?? taskRow.trait_code ?? null,
        description: null,
      },
      month: {
        totalCount: monthTotal,
        days: monthDays,
      },
      weeks: {
        weeklyGoal,
        completionRate: Number.isFinite(completionRate) ? completionRate : 0,
        currentStreak: streaks.current,
        bestStreak: streaks.best,
        timeline,
      },
    };

    if (process.env.DEBUG_STREAKS_PANEL === 'true') {
      console.info('[task-insights] payload', {
        taskId,
        userId: req.user?.id,
        timezone,
        today: formatDate(today),
        weeklyGoal,
        weeks: timeline.length,
      });
    }

    res.json(response);
  }),
);

export default router;
