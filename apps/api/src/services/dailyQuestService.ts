import type { PoolClient } from 'pg';
import { pool, withClient } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { formatDateInTimezone } from '../controllers/users/user-state-service.js';
import { applyHuntXpBoost, getMissionBoard } from './missionsV2Service.js';
import type { MissionObjective } from './missionsV2Types.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DailyQuestStatus = {
  date: string;
  submitted: boolean;
  submitted_at: string | null;
};

export type DailyQuestEmotionOption = {
  emotion_id: number;
  code: string;
  name: string;
};

export type DailyQuestTask = {
  task_id: string;
  name: string;
  trait_id: number | null;
  difficulty: string | null;
  difficulty_id: number | null;
  xp: number;
};

export type DailyQuestPillar = {
  pillar_code: string;
  tasks: DailyQuestTask[];
};

export type DailyQuestDefinition = DailyQuestStatus & {
  emotionOptions: DailyQuestEmotionOption[];
  pillars: DailyQuestPillar[];
};

export type DailyQuestXpSummary = {
  xp_total_today: number;
  streaks: {
    daily: number;
    weekly: number;
  };
};

export type SubmitDailyQuestInput = {
  date?: string;
  emotion_id: number;
  tasks_done: string[];
  notes: string | null;
};

export type SubmitDailyQuestResult = {
  ok: true;
  saved: {
    emotion: {
      emotion_id: number;
      date: string;
      notes: string | null;
    };
    tasks: {
      date: string;
      completed: string[];
    };
  };
  xp_delta: number;
  xp_total_today: number;
  streaks: DailyQuestXpSummary['streaks'];
  missions_v2: {
    bonus_ready: boolean;
    redirect_url: string;
    tasks: {
      mission_id: string;
      mission_name: string;
      slot: string;
      task_id: string;
      task_name: string;
    }[];
  };
};

type SubmitDailyQuestLogLevel = 'info' | 'warn' | 'error';

export type SubmitDailyQuestLogger = (
  level: SubmitDailyQuestLogLevel,
  message: string,
  data?: Record<string, unknown>,
) => void;

export type SubmitDailyQuestOptions = {
  requestId?: string;
  log?: SubmitDailyQuestLogger;
};

type UserContextRow = {
  tasks_group_id: string | null;
  timezone: string | null;
  today: string | null;
};

type EmotionRow = {
  emotion_id: number;
  code: string | null;
  name: string | null;
};

type TaskRow = {
  task_id: string;
  task: string | null;
  trait_id: number | null;
  difficulty_id: number | null;
  difficulty_code: string | null;
  xp_base: string | number | null;
  pillar_code: string;
};

type InternalDailyQuestTask = DailyQuestTask & {
  pillar_code: string;
};

type SubmissionTimestampRow = {
  submitted_at: Date | string | null;
};

type DailyXpRow = {
  date: string;
  xp_day: string | number | null;
};

type WeeklyXpRow = {
  week_start: string;
  xp_week: string | number | null;
};

type DailyQuestUserContext = {
  userId: string;
  tasksGroupId: string;
  timezone: string;
  today: string;
};

function parseDateInput(raw: unknown, timezone: string, fallback: string): string {
  if (typeof raw !== 'string') {
    return fallback;
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return fallback;
  }

  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw new HttpError(400, 'invalid_date', 'Date must use YYYY-MM-DD format');
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'invalid_date', 'Date must use YYYY-MM-DD format');
  }

  return trimmed;
}

async function loadUserContext(userId: string): Promise<DailyQuestUserContext> {
  const result = await pool.query<UserContextRow>(
    `SELECT tasks_group_id,
            timezone,
            timezone(COALESCE(timezone, 'UTC'), now())::date::text AS today
       FROM users
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  const row = result.rows[0];

  if (!row.tasks_group_id) {
    throw new HttpError(400, 'missing_tasks_group', 'User is not associated with a tasks group');
  }

  const timezone = row.timezone?.trim() || 'UTC';
  const today = row.today?.trim() || formatDateInTimezone(new Date(), timezone);

  return {
    userId,
    tasksGroupId: row.tasks_group_id,
    timezone,
    today,
  };
}

async function fetchEmotionOptions(): Promise<DailyQuestEmotionOption[]> {
  const result = await pool.query<EmotionRow>(
    `SELECT emotion_id, code, name
       FROM cat_emotion
   ORDER BY emotion_id
      LIMIT 7`,
  );

  return result.rows.map((row) => ({
    emotion_id: row.emotion_id,
    code: row.code ?? `E${row.emotion_id}`,
    name: row.name ?? row.code ?? `Emotion ${row.emotion_id}`,
  }));
}

async function fetchGroupTasks(tasksGroupId: string): Promise<InternalDailyQuestTask[]> {
  const result = await pool.query<TaskRow>(
    `SELECT t.task_id,
            t.task,
            t.trait_id,
            t.difficulty_id,
            cd.code AS difficulty_code,
            t.xp_base,
            cp.code AS pillar_code
       FROM tasks t
       JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE t.tasks_group_id = $1
        AND t.active = TRUE
   ORDER BY cp.pillar_id, t.created_at, t.task_id`,
    [tasksGroupId],
  );

  return result.rows.map((row) => ({
    task_id: row.task_id,
    name: row.task ?? 'Tarea',
    trait_id: row.trait_id,
    difficulty: row.difficulty_code,
    difficulty_id: row.difficulty_id,
    xp: Number(row.xp_base ?? 0),
    pillar_code: row.pillar_code ?? 'BODY',
  }));
}

function groupTasksByPillar(tasks: InternalDailyQuestTask[]): DailyQuestPillar[] {
  const map = new Map<string, InternalDailyQuestTask[]>();

  for (const task of tasks) {
    const pillarCode = task.pillar_code;
    const existing = map.get(pillarCode) ?? [];
    existing.push(task);
    map.set(pillarCode, existing);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pillar_code, pillarTasks]) => ({
      pillar_code,
      tasks: pillarTasks.map((task) => ({
        task_id: task.task_id,
        name: task.name,
        trait_id: task.trait_id,
        difficulty: task.difficulty,
        difficulty_id: task.difficulty_id,
        xp: task.xp,
      })),
    }));
}

function normalizeDate(date: string): string {
  return date.slice(0, 10);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function getDailyQuestStatus(
  userId: string,
  rawDate?: unknown,
): Promise<DailyQuestStatus> {
  const context = await loadUserContext(userId);
  const date = parseDateInput(rawDate, context.timezone, context.today);

  const status = await fetchSubmissionStatus(context.userId, date);

  return {
    date,
    submitted: status.submitted,
    submitted_at: status.submitted_at,
  };
}

async function fetchSubmissionStatus(userId: string, date: string): Promise<DailyQuestStatus> {
  const result = await pool.query<SubmissionTimestampRow>(
    `SELECT MIN(created_at) AS submitted_at
       FROM (
              SELECT created_at
                FROM daily_log
               WHERE user_id = $1
                 AND date = $2
             UNION ALL
              SELECT created_at
                FROM emotions_logs
               WHERE user_id = $1
                 AND date = $2
            ) AS submissions`,
    [userId, date],
  );

  const submittedAt = toIsoString(result.rows[0]?.submitted_at);

  return {
    date,
    submitted: Boolean(submittedAt),
    submitted_at: submittedAt,
  };
}

export async function getDailyQuestDefinition(
  userId: string,
  rawDate?: unknown,
): Promise<DailyQuestDefinition> {
  const context = await loadUserContext(userId);
  const date = parseDateInput(rawDate, context.timezone, context.today);

  const [status, emotionOptions, tasks] = await Promise.all([
    fetchSubmissionStatus(context.userId, date),
    fetchEmotionOptions(),
    fetchGroupTasks(context.tasksGroupId),
  ]);

  const pillars = groupTasksByPillar(tasks);

  return {
    date,
    submitted: status.submitted,
    submitted_at: status.submitted_at,
    emotionOptions,
    pillars,
  };
}

function parseDateKey(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const clone = parseDateKey(formatDateKey(date));
  clone.setUTCDate(clone.getUTCDate() + diff);
  return clone;
}

function addUtcDays(base: Date, amount: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

async function fetchDailyXp(userId: string, date: string): Promise<Map<string, number>> {
  const result = await pool.query<DailyXpRow>(
    `SELECT date::text AS date, xp_day
       FROM v_user_daily_xp
      WHERE user_id = $1
        AND date <= $2::date
   ORDER BY date DESC
      LIMIT 365`,
    [userId, date],
  );

  return result.rows.reduce((map, row) => {
    const key = normalizeDate(row.date);
    const value = Number(row.xp_day ?? 0);
    map.set(key, Number.isFinite(value) ? value : 0);
    return map;
  }, new Map<string, number>());
}

async function fetchWeeklyXp(userId: string, date: string): Promise<Map<string, number>> {
  const result = await pool.query<WeeklyXpRow>(
    `SELECT date_trunc('week', date)::date::text AS week_start,
            SUM(xp_day) AS xp_week
       FROM v_user_daily_xp
      WHERE user_id = $1
        AND date <= $2::date
   GROUP BY 1
   ORDER BY 1 DESC
      LIMIT 52`,
    [userId, date],
  );

  return result.rows.reduce((map, row) => {
    const key = normalizeDate(row.week_start);
    const value = Number(row.xp_week ?? 0);
    map.set(key, Number.isFinite(value) ? value : 0);
    return map;
  }, new Map<string, number>());
}

export async function calculateXpForDate(
  userId: string,
  date: string,
): Promise<DailyQuestXpSummary> {
  const normalizedDate = normalizeDate(date);
  const [dailyXp, weeklyXp] = await Promise.all([
    fetchDailyXp(userId, normalizedDate),
    fetchWeeklyXp(userId, normalizedDate),
  ]);

  const xpToday = dailyXp.get(normalizedDate) ?? 0;

  // Daily streak: consecutive days with XP > 0 ending on the selected date
  let dailyStreak = 0;
  let cursor = parseDateKey(normalizedDate);
  while (true) {
    const key = formatDateKey(cursor);
    const xp = dailyXp.get(key) ?? 0;
    if (xp > 0) {
      dailyStreak += 1;
      cursor = addUtcDays(cursor, -1);
    } else {
      break;
    }
  }

  // Weekly streak: consecutive Monday-start weeks with XP > 0
  let weeklyStreak = 0;
  let weekCursor = startOfWeek(parseDateKey(normalizedDate));
  for (let i = 0; i < 52; i += 1) {
    const key = formatDateKey(weekCursor);
    const xp = weeklyXp.get(key) ?? 0;
    if (xp > 0) {
      weeklyStreak += 1;
      weekCursor = addUtcDays(weekCursor, -7);
    } else {
      break;
    }
  }

  return {
    xp_total_today: xpToday,
    streaks: {
      daily: dailyStreak,
      weekly: weeklyStreak,
    },
  };
}

async function ensureEmotionExists(emotionId: number, log?: SubmitDailyQuestLogger): Promise<void> {
  const result = await pool.query(
    'SELECT 1 FROM cat_emotion WHERE emotion_id = $1 LIMIT 1',
    [emotionId],
  );

  if (result.rowCount === 0) {
    log?.('warn', 'Daily quest validation failed', {
      reason: 'invalid_emotion',
      emotionId,
    });
    throw new HttpError(422, 'invalid_emotion', 'Emotion not found');
  }
}

export async function submitDailyQuest(
  userId: string,
  input: SubmitDailyQuestInput,
  options: SubmitDailyQuestOptions = {},
): Promise<SubmitDailyQuestResult> {
  const log = options.log;
  const context = await loadUserContext(userId);
  const date = parseDateInput(input.date, context.timezone, context.today);
  const notes = input.notes?.trim() || null;

  await ensureEmotionExists(input.emotion_id, log);

  const tasks = await fetchGroupTasks(context.tasksGroupId);
  const allowedTaskIds = new Set(tasks.map((task) => task.task_id));
  const selectedTaskIds = Array.from(new Set(input.tasks_done));

  log?.('info', 'Daily quest validation started', {
    userId,
    resolvedDate: date,
    emotionId: input.emotion_id,
    requestedTasks: input.tasks_done.length,
  });

  for (const taskId of selectedTaskIds) {
    if (!allowedTaskIds.has(taskId)) {
      log?.('warn', 'Daily quest validation failed', {
        reason: 'invalid_task',
        taskId,
        resolvedDate: date,
        userId,
      });
      throw new HttpError(422, 'invalid_task', 'Task does not belong to the user');
    }
  }

  log?.('info', 'Daily quest validation succeeded', {
    userId,
    resolvedDate: date,
    emotionId: input.emotion_id,
    tasksSelected: selectedTaskIds.length,
    notesIncluded: Boolean(notes),
  });

  const xpBefore = await calculateXpForDate(userId, date);

  const completedTasks = selectedTaskIds;
  const tasksToDelete = tasks
    .map((task) => task.task_id)
    .filter((taskId) => !completedTasks.includes(taskId));

  await withClient(async (client: PoolClient) => {
    await client.query('BEGIN');

    try {
      await client.query(
        `INSERT INTO emotions_logs (user_id, date, emotion_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, date)
         DO UPDATE SET emotion_id = EXCLUDED.emotion_id`,
        [userId, date, input.emotion_id],
      );

      if (tasksToDelete.length > 0) {
        await client.query(
          `DELETE FROM daily_log
            WHERE user_id = $1
              AND date = $2
              AND task_id = ANY($3::uuid[])`,
          [userId, date, tasksToDelete],
        );
      }

      if (completedTasks.length > 0) {
        const values = completedTasks.map((taskId) => [userId, taskId, date, 1]);
        for (const [rowUserId, rowTaskId, rowDate, quantity] of values) {
          await client.query(
            `INSERT INTO daily_log (user_id, task_id, date, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, task_id, date)
             DO UPDATE SET quantity = EXCLUDED.quantity`,
            [rowUserId, rowTaskId, rowDate, quantity],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      const pgError = error as { code?: string | number | null; constraint?: string | null };
      log?.('error', 'Daily quest database error', {
        userId,
        resolvedDate: date,
        message: error instanceof Error ? error.message : 'Unknown database error',
        pgCode: pgError?.code ?? null,
        constraint: pgError?.constraint ?? null,
      });
      throw error;
    }
  });

  log?.('info', 'Daily quest database operations', {
    userId,
    resolvedDate: date,
    upserts: {
      emotionLog: true,
      tasksInserted: completedTasks.length,
      tasksDeleted: tasksToDelete.length,
    },
  });

  const xpAfter = await calculateXpForDate(userId, date);

  const booster = await applyHuntXpBoost({
    userId,
    date,
    completedTaskIds: completedTasks,
    baseXpDelta: xpAfter.xp_total_today - xpBefore.xp_total_today,
    xpTotalToday: xpAfter.xp_total_today,
  });

  const board = await getMissionBoard(userId);
  const missionTasks = board.slots.flatMap((slot) => {
    const mission = slot.mission ?? slot.proposals[0] ?? null;

    if (!mission) {
      return [];
    }

    return mission.objectives
      .filter((objective): objective is MissionObjective =>
        typeof objective?.id === 'string' &&
        typeof objective?.label === 'string' &&
        typeof objective?.target === 'number' &&
        typeof objective?.unit === 'string',
      )
      .map((objective) => ({
        mission_id: mission.id,
        mission_name: mission.title,
        slot: slot.slot,
        task_id: objective.id,
        task_name: objective.label,
      }));
  });
  const heartbeatReady = board.slots.some((slot) =>
    slot.actions?.some((action) => action.type === 'heartbeat' && action.available),
  );
  const selectionReady = board.slots.some((slot) =>
    slot.actions?.some((action) => action.type === 'select' && action.available),
  );

  const missionsV2BonusReady = heartbeatReady || missionTasks.length > 0 || selectionReady;

  return {
    ok: true,
    saved: {
      emotion: {
        emotion_id: input.emotion_id,
        date,
        notes,
      },
      tasks: {
        date,
        completed: completedTasks,
      },
    },
    xp_delta: booster.xp_delta,
    xp_total_today: booster.xp_total_today,
    streaks: xpAfter.streaks,
    missions_v2: {
      bonus_ready: missionsV2BonusReady,
      redirect_url: '/dashboard-v3/missions-v2',
      tasks: missionTasks,
    },
  } satisfies SubmitDailyQuestResult;
}
