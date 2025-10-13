import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from '../../controllers/users/shared.js';
import { parseWithValidation, uuidSchema } from '../../lib/validation.js';

const MODE_TIERS: Record<Mode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

const PILLAR_CODES: Record<Pillar, string> = {
  Body: 'BODY',
  Mind: 'MIND',
  Soul: 'SOUL',
};

type Mode = 'Low' | 'Chill' | 'Flow' | 'Evolve';
type Pillar = 'Body' | 'Mind' | 'Soul';
type Range = 'week' | 'month' | 'qtr';

type TaskRow = {
  task_id: string;
  task: string;
  xp_base: string | number | null;
  trait_name: string | null;
  trait_code: string | null;
};

type LogRow = {
  task_id: string;
  date: string;
  count: string | number | null;
};

type TaskLog = {
  date: Date;
  count: number;
};

type WeekSegment = {
  weekStart: Date;
  rangeStart: Date;
  rangeEnd: Date;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = z.object({
  pillar: z.enum(['Body', 'Mind', 'Soul'] satisfies readonly Pillar[] as unknown as [Pillar, ...Pillar[]]),
  range: z.enum(['week', 'month', 'qtr'] satisfies readonly Range[] as unknown as [Range, ...Range[]]),
  mode: z.string().optional(),
  query: z.string().optional(),
});

const MAX_STREAK_WEEKS = 52;

function normalizeMode(value: string | undefined | null): Mode {
  if (!value) {
    return 'Flow';
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'low':
      return 'Low';
    case 'chill':
      return 'Chill';
    case 'evolve':
    case 'evol':
      return 'Evolve';
    case 'flow':
    case 'flow mood':
    case 'flow_mood':
      return 'Flow';
    default:
      return 'Flow';
  }
}

function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseDate(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }

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

function weeksOfMonth(reference: Date): WeekSegment[] {
  const monthStart = startOfMonth(reference);
  const monthEndExclusive = addMonths(monthStart, 1);
  const firstWeekStart = startOfWeek(monthStart);
  const weeks: WeekSegment[] = [];

  for (let cursor = firstWeekStart; cursor < monthEndExclusive; cursor = addDays(cursor, 7)) {
    const weekStart = cursor;
    const weekEndExclusive = addDays(weekStart, 7);
    const rangeStart = weekStart < monthStart ? monthStart : weekStart;
    const rangeEnd = weekEndExclusive > monthEndExclusive ? monthEndExclusive : weekEndExclusive;

    if (rangeStart >= rangeEnd) {
      continue;
    }

    weeks.push({
      weekStart,
      rangeStart,
      rangeEnd,
    });
  }

  return weeks;
}

function sumCountsInRange(logs: TaskLog[], start: Date, endExclusive: Date): number {
  let total = 0;
  for (const log of logs) {
    if (log.date >= start && log.date < endExclusive) {
      total += log.count;
    }
  }
  return total;
}

function buildDayCounts(logs: TaskLog[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const key = formatDate(log.date);
    counts.set(key, (counts.get(key) ?? 0) + log.count);
  }
  return counts;
}

function computeStreakDays(dayCounts: Map<string, number>, referenceDate: Date, tier: number): number {
  if (tier <= 0) {
    return 0;
  }

  let streak = 0;
  let cursor = new Date(referenceDate.getTime());

  for (let i = 0; i < MAX_STREAK_WEEKS * 7; i += 1) {
    const key = formatDate(cursor);
    const count = dayCounts.get(key) ?? 0;
    if (count > 0) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }

  return streak;
}

const isPanelEnabled = String(process.env.SHOW_STREAKS_PANEL ?? 'true').toLowerCase() !== 'false';

export const getUserStreakPanel: AsyncHandler = async (req, res) => {
  if (!isPanelEnabled) {
    res.status(404).json({ error: 'streak_panel_disabled' });
    return;
  }

  const { id } = parseWithValidation(paramsSchema, req.params);
  const { pillar, range, mode: rawMode, query } = parseWithValidation(querySchema, req.query);

  await ensureUserExists(id);

  const mode = normalizeMode(rawMode);
  const tier = MODE_TIERS[mode];

  const userRow = await pool.query<{ timezone: string | null; today: string | null }>(
    `SELECT COALESCE(timezone, 'UTC') AS timezone,
            timezone(COALESCE(timezone, 'UTC'), now())::date::text AS today
       FROM users
      WHERE user_id = $1
      LIMIT 1`,
    [id],
  );

  const timezone = userRow.rows[0]?.timezone ?? 'UTC';
  const today = parseDate(userRow.rows[0]?.today ?? undefined);

  const currentWeekStart = startOfWeek(today);
  const currentWeekEndExclusive = addDays(currentWeekStart, 7);
  const currentMonthStart = startOfMonth(today);
  const currentMonthEndExclusive = addMonths(currentMonthStart, 1);

  const quarterMonths = [-2, -1, 0].map((offset) => {
    const start = addMonths(currentMonthStart, offset);
    const end = addMonths(start, 1);
    return { start, end };
  });

  const quarterStart = quarterMonths[0]?.start ?? currentMonthStart;
  const quarterEndExclusive = quarterMonths[quarterMonths.length - 1]?.end ?? currentMonthEndExclusive;

  const streakHistoryStart = addDays(currentWeekStart, -7 * (MAX_STREAK_WEEKS - 1));
  const overallStart = quarterStart < streakHistoryStart ? quarterStart : streakHistoryStart;
  const overallEndExclusive = currentWeekEndExclusive > quarterEndExclusive ? currentWeekEndExclusive : quarterEndExclusive;
  const logsFrom = formatDate(overallStart);
  const logsTo = formatDate(addDays(overallEndExclusive, -1));

  const taskResult = await pool.query<TaskRow>(
    `SELECT t.task_id,
            t.task,
            t.xp_base,
            ct.name AS trait_name,
            ct.code AS trait_code
       FROM tasks t
       JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
      WHERE t.user_id = $1
        AND t.active = true
        AND cp.code = $2
   ORDER BY t.task`,
    [id, PILLAR_CODES[pillar]],
  );

  const queryFilter = normalizeText(query);

  const definitions = taskResult.rows.map((row) => {
    const name = row.task ?? '';
    const stat = row.trait_name ?? row.trait_code ?? '';
    const xpBaseRaw = Number(row.xp_base ?? 0);
    const xpBase = Number.isFinite(xpBaseRaw) ? xpBaseRaw : 0;
    const normalizedName = normalizeText(name);
    const normalizedStat = normalizeText(stat);
    const normalizedTrait = normalizeText(row.trait_code);

    return {
      id: row.task_id,
      name,
      stat,
      xpBase,
      normalizedSearch: `${normalizedName} ${normalizedStat} ${normalizedTrait}`.trim(),
    };
  });

  const filteredDefinitions = queryFilter
    ? definitions.filter((task) => task.normalizedSearch.includes(queryFilter))
    : definitions;

  const filteredIds = filteredDefinitions.map((task) => task.id);

  let logsByTask = new Map<string, TaskLog[]>();

  if (filteredIds.length > 0) {
    const logResult = await pool.query<LogRow>(
      `SELECT task_id, date::text AS date, SUM(quantity) AS count
         FROM daily_log
        WHERE user_id = $1
          AND task_id = ANY($2)
          AND date BETWEEN $3 AND $4
     GROUP BY task_id, date`,
      [id, filteredIds, logsFrom, logsTo],
    );

    logsByTask = logResult.rows.reduce((map, row) => {
      const existing = map.get(row.task_id) ?? [];
      const count = Number(row.count ?? 0);
      const normalizedCount = Number.isFinite(count) ? count : 0;
      existing.push({ date: parseDate(row.date), count: normalizedCount });
      map.set(row.task_id, existing);
      return map;
    }, new Map<string, TaskLog[]>());

    for (const [, entries] of logsByTask) {
      entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }

  const monthSegments = weeksOfMonth(today);

  const tasks = filteredDefinitions.map((task) => {
    const logs = logsByTask.get(task.id) ?? [];
    const dayCounts = buildDayCounts(logs);

    const weekCount = sumCountsInRange(logs, currentWeekStart, currentWeekEndExclusive);
    const weekXp = weekCount * task.xpBase;

    const monthWeeks = monthSegments.map((segment) => sumCountsInRange(logs, segment.rangeStart, segment.rangeEnd));
    const monthCount = monthWeeks.reduce((total, value) => total + value, 0);
    const monthXp = monthCount * task.xpBase;

    const quarterCount = sumCountsInRange(logs, quarterStart, quarterEndExclusive);
    const quarterXp = quarterCount * task.xpBase;

    const quarterWeeks = quarterMonths.map(({ start }) => {
      const weeks = weeksOfMonth(start);
      const totalWeeks = weeks.length || 1;
      let hit = 0;

      for (const week of weeks) {
        const count = sumCountsInRange(logs, week.rangeStart, week.rangeEnd);
        if (count >= tier) {
          hit += 1;
        }
      }

      const scaled = (hit / totalWeeks) * tier;
      return Number.isFinite(scaled) ? Number(scaled.toFixed(2)) : 0;
    });

    const streakDays = computeStreakDays(dayCounts, today, tier);

    return {
      id: task.id,
      name: task.name,
      stat: task.stat || '—',
      weekDone: weekCount,
      streakDays,
      metrics: {
        week: {
          count: weekCount,
          xp: weekXp,
        },
        month: {
          count: monthCount,
          xp: monthXp,
          weeks: monthWeeks,
        },
        qtr: {
          count: quarterCount,
          xp: quarterXp,
          weeks: quarterWeeks,
        },
      },
    };
  });

  const topStreaks = tasks
    .filter((task) => task.streakDays >= 2)
    .sort((a, b) => b.streakDays - a.streakDays)
    .slice(0, 3)
    .map((task) => ({
      id: task.id,
      name: task.name,
      stat: task.stat,
      weekDone: task.metrics.week.count,
      streakDays: task.streakDays,
    }));

  if (process.env.DEBUG_STREAKS_PANEL === 'true') {
    console.info('[streak-panel] payload', {
      userId: id,
      timezone,
      today: formatDate(today),
      pillar,
      range,
      mode,
      query: queryFilter,
      tasks: tasks.length,
      topStreaks: topStreaks.length,
    });
  }

  res.json({
    topStreaks,
    tasks,
  });
};

