import { pool } from '../../db.js';
import { buildLevelSummary } from '../../controllers/users/level-summary.js';
import type { LevelThreshold } from '../../controllers/users/types.js';
import { HttpError } from '../../lib/http-error.js';
import {
  type InsightQuery,
  type ListUsersQuery,
  type LogsQuery,
  type TaskStatsQuery,
  type TasksQuery,
  type UpdateTaskBody,
} from './admin.schemas.js';

type AdminUserListItem = {
  id: string;
  email: string | null;
  name: string | null;
  gameMode: string | null;
  createdAt: string;
};

type AdminInsights = {
  profile: {
    id: string;
    email: string | null;
    name: string | null;
    gameMode: string | null;
    createdAt: string;
  };
  level: { level: number; xpCurrent: number; xpToNext: number };
  xp: {
    total: number;
    last30d: number;
    last90d: number;
    byPillar: { body: number; mind: number; soul: number };
  };
  streaks: { dailyCurrent: number; weeklyCurrent: number; longest: number };
  constancyWeekly: { body: number; mind: number; soul: number };
  emotions: { last7: string[]; last30: string[]; top3: string[] };
};

type AdminLogRow = {
  date: string;
  week: string;
  pillar: string;
  trait: string;
  stat: string | null;
  taskId: string;
  taskName: string;
  difficulty: string;
  xp: number;
  state: 'red' | 'yellow' | 'green';
  timesInRange: number;
  source: 'form' | 'manual' | 'import';
  notes: string | null;
};

type AdminTask = {
  taskId: string;
  taskName: string;
  pillar: string;
  trait: string;
  difficulty: string;
  weeklyTarget: number | null;
  createdAt: string;
  archived: boolean;
};

type AdminTaskStat = {
  taskId: string;
  taskName: string;
  pillar: string;
  trait: string;
  difficulty: string;
  totalXp: number;
  totalCompletions: number;
  daysActive: number;
  firstCompletedAt: string | null;
  lastCompletedAt: string | null;
  state: 'red' | 'yellow' | 'green';
};

type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

type UserProfileRow = {
  user_id: string;
  email_primary: string | null;
  full_name: string | null;
  game_mode_code: string | null;
  created_at: string | Date;
};

type DailyXpRow = {
  date: string | Date;
  xp_day: string | number | null;
};

type LevelRow = {
  level: string | number | null;
  xp_required: string | number | null;
};

type TotalXpRow = {
  total_xp: string | number | null;
};

type PillarMetricRow = Record<string, unknown>;

type PillarAggregateRow = {
  pillar_code: string | null;
  pillar_name: string | null;
  xp_total?: string | number | null;
  xp_week?: string | number | null;
};

type EmotionRow = {
  date: string | Date;
  emotion: string | null;
};

type LogQueryRow = {
  date: string | Date;
  week_key: string;
  task_id: string;
  task: string | null;
  quantity: string | number | null;
  pillar_name: string | null;
  pillar_code: string | null;
  trait_name: string | null;
  trait_code: string | null;
  difficulty_name: string | null;
  difficulty_code: string | null;
  xp_value: string | number | null;
};

type TaskRow = {
  task_id: string;
  task: string | null;
  pillar_name: string | null;
  pillar_code: string | null;
  trait_name: string | null;
  trait_code: string | null;
  difficulty_name: string | null;
  difficulty_code: string | null;
  created_at: string | Date;
  active: boolean | null;
};

type TaskStatsRow = {
  task_id: string;
  task: string | null;
  pillar_name: string | null;
  pillar_code: string | null;
  trait_name: string | null;
  trait_code: string | null;
  difficulty_name: string | null;
  difficulty_code: string | null;
  total_quantity: string | number | null;
  active_days: string | number | null;
  total_xp: string | number | null;
  first_date: string | Date | null;
  last_date: string | Date | null;
};

const PILLAR_KEYS = ['body', 'mind', 'soul'] as const;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function formatDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = value.toString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return copy;
}

function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7; // Monday = 0
  return addDays(copy, -diff);
}

function parseDateKey(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function pillarFromRow(row: PillarMetricRow): (typeof PILLAR_KEYS)[number] | null {
  const candidates = ['pillar_code', 'pillar', 'pillar_name', 'code', 'name', 'pillarid', 'pillar_id'];

  for (const key of candidates) {
    if (!(key in row)) {
      continue;
    }

    const raw = row[key];
    if (raw === null || raw === undefined) {
      continue;
    }

    const text = raw.toString().trim();
    if (!text) {
      continue;
    }

    const normalized = text.toLowerCase();
    if (normalized.includes('body') || normalized === '1') {
      return 'body';
    }
    if (normalized.includes('mind') || normalized === '2') {
      return 'mind';
    }
    if (normalized.includes('soul') || normalized === '3') {
      return 'soul';
    }
  }

  for (const value of Object.values(row)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
      const text = value.toString().trim();
      const normalized = text.toLowerCase();
      if (normalized.includes('body') || normalized === '1') {
        return 'body';
      }
      if (normalized.includes('mind') || normalized === '2') {
        return 'mind';
      }
      if (normalized.includes('soul') || normalized === '3') {
        return 'soul';
      }
    }
  }

  return null;
}

function extractMetric(row: PillarMetricRow, preferWeekly: boolean): number {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const lowerKey = key.toLowerCase();
    if (!lowerKey.includes('xp')) {
      continue;
    }

    if (preferWeekly) {
      if (!lowerKey.includes('week') && !lowerKey.includes('7')) {
        continue;
      }
    } else if (lowerKey.includes('week') || lowerKey.includes('7')) {
      continue;
    }

    const parsed = toNumber(value);
    if (parsed !== 0 || value === 0 || value === '0') {
      return parsed;
    }
  }

  if (preferWeekly) {
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.includes('week')) {
        continue;
      }
      const parsed = toNumber(value);
      if (parsed !== 0 || value === 0 || value === '0') {
        return parsed;
      }
    }
  } else {
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.includes('total')) {
        continue;
      }
      const parsed = toNumber(value);
      if (parsed !== 0 || value === 0 || value === '0') {
        return parsed;
      }
    }
  }

  return 0;
}

function sortStreakDatesDescending(map: Map<string, number>): string[] {
  return Array.from(map.keys()).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

export async function listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
  const { page, pageSize, query: search } = query;
  const filters: string[] = ['u.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search.trim()}%`);
    const index = params.length;
    filters.push(`(u.email_primary ILIKE $${index} OR u.full_name ILIKE $${index})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query<{ count: string | number }>(
    `SELECT COUNT(*) AS count FROM users u ${whereClause}`,
    params,
  );

  const total = toNumber(countResult.rows[0]?.count ?? 0);
  const offset = (page - 1) * pageSize;
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  const dataResult = await pool.query<UserProfileRow>(
    `SELECT u.user_id,
            u.email_primary,
            u.full_name,
            gm_id.code AS game_mode_code,
            u.created_at
       FROM users u
  LEFT JOIN cat_game_mode gm_id
         ON gm_id.game_mode_id = u.game_mode_id
      ${whereClause}
   ORDER BY u.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...params, pageSize, offset],
  );

  const items: AdminUserListItem[] = dataResult.rows.map((row) => ({
    id: row.user_id,
    email: row.email_primary ?? null,
    name: row.full_name ?? null,
    gameMode: row.game_mode_code ?? null,
    createdAt: formatDate(row.created_at),
  }));

  return {
    items,
    page,
    pageSize,
    total,
  };
}

function computeStreaks(dailyXp: Map<string, number>, todayKey: string): {
  dailyCurrent: number;
  weeklyCurrent: number;
  longest: number;
} {
  const today = parseDateKey(todayKey) ?? new Date();
  let dailyCurrent = 0;
  let cursor = today;

  for (let i = 0; i < 366; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const xp = dailyXp.get(key) ?? 0;
    if (xp > 0) {
      dailyCurrent += 1;
      cursor = addDays(cursor, -1);
    } else {
      break;
    }
  }

  const sortedKeys = sortStreakDatesDescending(dailyXp);
  let longest = 0;
  let running = 0;
  let previousDate: Date | null = null;

  for (let i = sortedKeys.length - 1; i >= 0; i -= 1) {
    const key = sortedKeys[i]!;
    const xp = dailyXp.get(key) ?? 0;
    if (xp <= 0) {
      running = 0;
      previousDate = null;
      continue;
    }

    const currentDate = parseDateKey(key);
    if (!currentDate) {
      running = 0;
      previousDate = null;
      continue;
    }

    if (previousDate) {
      const diffMs = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        running += 1;
      } else {
        running = 1;
      }
    } else {
      running = 1;
    }

    previousDate = currentDate;
    if (running > longest) {
      longest = running;
    }
  }

  const weekMap = new Map<string, number>();
  for (const key of dailyXp.keys()) {
    const xp = dailyXp.get(key) ?? 0;
    if (xp <= 0) {
      continue;
    }
    const date = parseDateKey(key);
    if (!date) {
      continue;
    }
    const weekKey = startOfWeek(date).toISOString().slice(0, 10);
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + xp);
  }

  let weeklyCurrent = 0;
  let weekCursor = startOfWeek(today);
  for (let i = 0; i < 53; i += 1) {
    const key = weekCursor.toISOString().slice(0, 10);
    const xp = weekMap.get(key) ?? 0;
    if (xp > 0) {
      weeklyCurrent += 1;
      weekCursor = addDays(weekCursor, -7);
    } else {
      break;
    }
  }

  return { dailyCurrent, weeklyCurrent, longest };
}

function normalizeDailyXp(rows: DailyXpRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = formatDateOnly(row.date ?? new Date());
    const value = toNumber(row.xp_day ?? 0);
    const current = map.get(key) ?? 0;
    map.set(key, Math.max(current, value));
  }
  return map;
}

function computeXpWindows(dailyXp: Map<string, number>, today: Date) {
  const start30 = addDays(startOfDay(today), -29);
  const start90 = addDays(startOfDay(today), -89);

  let last30d = 0;
  let last90d = 0;

  for (const [key, value] of dailyXp.entries()) {
    const date = parseDateKey(key);
    if (!date) {
      continue;
    }

    if (date >= start90) {
      last90d += value;
      if (date >= start30) {
        last30d += value;
      }
    }
  }

  return {
    last30d: Math.max(0, Math.round(last30d)),
    last90d: Math.max(0, Math.round(last90d)),
  };
}

function normalizePillarMetrics(rows: PillarMetricRow[], { preferWeekly }: { preferWeekly: boolean }): {
  body: number;
  mind: number;
  soul: number;
} {
  const totals = Object.fromEntries(PILLAR_KEYS.map((pillar) => [pillar, 0])) as Record<
    (typeof PILLAR_KEYS)[number],
    number
  >;

  for (const row of rows) {
    const pillar = pillarFromRow(row);
    if (!pillar) {
      continue;
    }
    totals[pillar] = extractMetric(row, preferWeekly);
  }

  return {
    body: Math.round(totals.body ?? 0),
    mind: Math.round(totals.mind ?? 0),
    soul: Math.round(totals.soul ?? 0),
  };
}

function normalizeEmotionTimeline(rows: EmotionRow[]) {
  const today = startOfDay(new Date());
  const start7 = addDays(today, -6);
  const start30 = addDays(today, -29);

  const last7: string[] = [];
  const last30: string[] = [];
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.emotion) {
      continue;
    }
    const date = parseDateKey(formatDateOnly(row.date ?? today));
    if (!date) {
      continue;
    }
    const emotion = row.emotion;
    if (date >= start30) {
      last30.push(emotion);
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
      if (date >= start7) {
        last7.push(emotion);
      }
    }
  }

  const top3 = Array.from(counts.entries())
    .sort((a, b) => (b[1] === a[1] ? (a[0] > b[0] ? 1 : -1) : b[1] - a[1]))
    .slice(0, 3)
    .map(([emotion]) => emotion);

  return { last7, last30, top3 };
}

async function fetchPillarMetrics(
  userId: string,
  options: { days?: number } = {},
): Promise<PillarMetricRow[]> {
  const params: unknown[] = [userId];
  const hasWindow = typeof options.days === 'number' && Number.isFinite(options.days);
  const alias = hasWindow ? 'xp_week' : 'xp_total';
  let dateClause = '';

  if (hasWindow) {
    const safeDays = Math.max(0, Math.floor(options.days as number));
    params.push(safeDays);
    const index = params.length;
    dateClause = `AND dl.date >= (CURRENT_DATE - ($${index}::int) * INTERVAL '1 day')`;
  }

  const result = await pool.query<PillarAggregateRow>(
    `SELECT cp.code AS pillar_code,
            cp.name AS pillar_name,
            SUM(COALESCE(dl.quantity, 1) * COALESCE(cd.xp_base, 0)) AS ${alias}
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE dl.user_id = $1
        ${dateClause}
   GROUP BY cp.code, cp.name
   ORDER BY cp.code NULLS LAST`,
    params,
  );

  return result.rows.map((row) => ({ ...row })) as PillarMetricRow[];
}

export async function getUserInsights(userId: string, _query: InsightQuery): Promise<AdminInsights> {
  void _query;
  const profileResult = await pool.query<UserProfileRow>(
    `SELECT u.user_id,
            u.email_primary,
            u.full_name,
            gm_id.code AS game_mode_code,
            u.created_at
       FROM users u
  LEFT JOIN cat_game_mode gm_id
         ON gm_id.game_mode_id = u.game_mode_id
      WHERE u.user_id = $1
      LIMIT 1`,
    [userId],
  );

  const profileRow = profileResult.rows[0];
  if (!profileRow) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  const totalXpResult = await pool.query<TotalXpRow>(
    `SELECT COALESCE(total_xp, 0) AS total_xp
       FROM v_user_total_xp
      WHERE user_id = $1`,
    [userId],
  );

  const totalXp = Math.max(0, toNumber(totalXpResult.rows[0]?.total_xp ?? 0));

  const thresholdsResult = await pool.query<LevelRow>(
    `SELECT level, xp_required
       FROM v_user_level
      WHERE user_id = $1
      ORDER BY level ASC`,
    [userId],
  );

  const thresholds: LevelThreshold[] = thresholdsResult.rows.map((row) => ({
    level: Number(row.level ?? 0),
    xpRequired: Number(row.xp_required ?? 0),
  }));
  const levelSummary = buildLevelSummary(totalXp, thresholds);

  const dailyXpResult = await pool.query<DailyXpRow>(
    `SELECT date, xp_day
       FROM v_user_daily_xp
      WHERE user_id = $1
        AND date >= (CURRENT_DATE - INTERVAL '365 day')
      ORDER BY date DESC`,
    [userId],
  );

  const dailyXpMap = normalizeDailyXp(dailyXpResult.rows);
  const today = startOfDay(new Date());
  const xpWindows = computeXpWindows(dailyXpMap, today);
  const streaks = computeStreaks(dailyXpMap, today.toISOString().slice(0, 10));

  const [pillarTotalsRows, pillarWeekRows, emotionsResult] = await Promise.all([
    fetchPillarMetrics(userId),
    fetchPillarMetrics(userId, { days: 7 }),
    pool.query<EmotionRow>(
      `SELECT el.date,
              COALESCE(ce.code, ce.name) AS emotion
         FROM emotions_logs el
    LEFT JOIN cat_emotion ce
           ON ce.emotion_id = el.emotion_id
        WHERE el.user_id = $1
          AND el.date >= (CURRENT_DATE - INTERVAL '30 day')
        ORDER BY el.date DESC`,
      [userId],
    ),
  ]);

  const xpByPillar = normalizePillarMetrics(pillarTotalsRows ?? [], { preferWeekly: false });
  const constancy = normalizePillarMetrics(pillarWeekRows ?? [], { preferWeekly: true });
  const emotions = normalizeEmotionTimeline(emotionsResult.rows ?? []);

  return {
    profile: {
      id: profileRow.user_id,
      email: profileRow.email_primary ?? null,
      name: profileRow.full_name ?? null,
      gameMode: profileRow.game_mode_code ?? null,
      createdAt: formatDate(profileRow.created_at),
    },
    level: {
      level: levelSummary.currentLevel,
      xpCurrent: totalXp,
      xpToNext: levelSummary.xpToNext ?? 0,
    },
    xp: {
      total: totalXp,
      last30d: xpWindows.last30d,
      last90d: xpWindows.last90d,
      byPillar: xpByPillar,
    },
    streaks,
    constancyWeekly: constancy,
    emotions,
  };
}

function resolveSort(sort: string | undefined): { orderBy: string; direction: 'ASC' | 'DESC' } {
  if (!sort) {
    return { orderBy: 'dl.date', direction: 'DESC' };
  }

  const [field, dir] = sort.split(':');
  const direction = dir?.toLowerCase() === 'asc' ? 'ASC' : dir?.toLowerCase() === 'desc' ? 'DESC' : 'DESC';

  switch (field) {
    case 'date':
      return { orderBy: 'dl.date', direction };
    case 'xp':
      return { orderBy: 'xp_value', direction };
    case 'task':
    case 'taskName':
      return { orderBy: 't.task', direction };
    case 'pillar':
      return { orderBy: 'cp.name', direction };
    case 'trait':
      return { orderBy: 'ct.name', direction };
    default:
      return { orderBy: 'dl.date', direction: 'DESC' };
  }
}

export async function getUserLogs(
  userId: string,
  query: LogsQuery,
): Promise<PaginatedResult<AdminLogRow>> {
  const filters = ['dl.user_id = $1'];
  const params: unknown[] = [userId];

  if (query.from) {
    params.push(query.from);
    filters.push(`dl.date >= $${params.length}`);
  }

  if (query.to) {
    params.push(query.to);
    filters.push(`dl.date <= $${params.length}`);
  }

  if (query.pillar) {
    params.push(`%${query.pillar.trim()}%`);
    filters.push(`(cp.code ILIKE $${params.length} OR cp.name ILIKE $${params.length})`);
  }

  if (query.trait) {
    params.push(`%${query.trait.trim()}%`);
    filters.push(`(ct.code ILIKE $${params.length} OR ct.name ILIKE $${params.length})`);
  }

  if (query.difficulty) {
    params.push(`%${query.difficulty.trim()}%`);
    filters.push(`(cd.code ILIKE $${params.length} OR cd.name ILIKE $${params.length})`);
  }

  if (query.q) {
    params.push(`%${query.q.trim()}%`);
    const idx = params.length;
    filters.push(`(t.task ILIKE $${idx} OR ct.name ILIKE $${idx} OR cp.name ILIKE $${idx})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await pool.query<{ count: string | number }>(
    `SELECT COUNT(*) AS count
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      ${whereClause}`,
    params,
  );

  const total = toNumber(countResult.rows[0]?.count ?? 0);
  const { orderBy, direction } = resolveSort(query.sort);
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;
  const offset = (query.page - 1) * query.pageSize;

  const dataResult = await pool.query<LogQueryRow>(
    `SELECT dl.date,
            to_char(date_trunc('week', dl.date), 'IYYY-"W"IW') AS week_key,
            dl.task_id,
            t.task,
            dl.quantity,
            cp.name AS pillar_name,
            cp.code AS pillar_code,
            ct.name AS trait_name,
            ct.code AS trait_code,
            cd.name AS difficulty_name,
            cd.code AS difficulty_code,
            (COALESCE(dl.quantity, 1) * COALESCE(cd.xp_base, 0)) AS xp_value
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      ${whereClause}
   ORDER BY ${orderBy} ${direction}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...params, query.pageSize, offset],
  );

  const items: AdminLogRow[] = dataResult.rows.map((row) => {
    const xp = Math.max(0, toNumber(row.xp_value ?? 0));
    const quantity = Math.max(1, toNumber(row.quantity ?? 1));
    const pillar = row.pillar_name ?? row.pillar_code ?? '—';
    const trait = row.trait_name ?? row.trait_code ?? '—';
    const difficulty = row.difficulty_name ?? row.difficulty_code ?? '—';
    const state: 'red' | 'yellow' | 'green' = xp <= 0 ? 'red' : xp < 20 ? 'yellow' : 'green';

    return {
      date: formatDateOnly(row.date),
      week: row.week_key ?? '',
      pillar,
      trait,
      stat: null,
      taskId: row.task_id,
      taskName: row.task ?? 'Tarea sin nombre',
      difficulty,
      xp,
      state,
      timesInRange: quantity,
      source: 'form',
      notes: null,
    };
  });

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function getUserTaskStats(userId: string, query: TaskStatsQuery): Promise<AdminTaskStat[]> {
  const filters = ['dl.user_id = $1'];
  const params: unknown[] = [userId];

  if (query.from) {
    params.push(query.from);
    filters.push(`dl.date >= $${params.length}`);
  }

  if (query.to) {
    params.push(query.to);
    filters.push(`dl.date <= $${params.length}`);
  }

  if (query.pillar) {
    params.push(`%${query.pillar.trim()}%`);
    filters.push(`(cp.code ILIKE $${params.length} OR cp.name ILIKE $${params.length})`);
  }

  if (query.trait) {
    params.push(`%${query.trait.trim()}%`);
    filters.push(`(ct.code ILIKE $${params.length} OR ct.name ILIKE $${params.length})`);
  }

  if (query.difficulty) {
    params.push(`%${query.difficulty.trim()}%`);
    filters.push(`(cd.code ILIKE $${params.length} OR cd.name ILIKE $${params.length})`);
  }

  if (query.q) {
    params.push(`%${query.q.trim()}%`);
    const idx = params.length;
    filters.push(`(t.task ILIKE $${idx} OR ct.name ILIKE $${idx} OR cp.name ILIKE $${idx})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await pool.query<TaskStatsRow>(
    `SELECT dl.task_id,
            t.task,
            cp.name AS pillar_name,
            cp.code AS pillar_code,
            ct.name AS trait_name,
            ct.code AS trait_code,
            cd.name AS difficulty_name,
            cd.code AS difficulty_code,
            SUM(COALESCE(dl.quantity, 1)) AS total_quantity,
            COUNT(DISTINCT dl.date) AS active_days,
            SUM(COALESCE(dl.quantity, 1) * COALESCE(cd.xp_base, 0)) AS total_xp,
            MIN(dl.date) AS first_date,
            MAX(dl.date) AS last_date
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      ${whereClause}
   GROUP BY dl.task_id, t.task, cp.name, cp.code, ct.name, ct.code, cd.name, cd.code
   ORDER BY total_xp DESC NULLS LAST, t.task ASC`,
    params,
  );

  return result.rows.map((row) => {
    const totalXp = Math.max(0, toNumber(row.total_xp ?? 0));
    const totalCompletions = Math.max(0, toNumber(row.total_quantity ?? 0));
    const daysActive = Math.max(0, toNumber(row.active_days ?? 0));
    const pillar = row.pillar_name ?? row.pillar_code ?? '—';
    const trait = row.trait_name ?? row.trait_code ?? '—';
    const difficulty = row.difficulty_name ?? row.difficulty_code ?? '—';
    const firstCompletedAt = row.first_date ? formatDateOnly(row.first_date) : null;
    const lastCompletedAt = row.last_date ? formatDateOnly(row.last_date) : null;
    const state: 'red' | 'yellow' | 'green' = totalXp <= 0 ? 'red' : totalXp < 20 ? 'yellow' : 'green';

    return {
      taskId: row.task_id,
      taskName: row.task ?? 'Tarea sin nombre',
      pillar,
      trait,
      difficulty,
      totalXp,
      totalCompletions,
      daysActive,
      firstCompletedAt,
      lastCompletedAt,
      state,
    };
  });
}

export async function getUserTasks(
  userId: string,
  query: TasksQuery,
): Promise<PaginatedResult<AdminTask>> {
  const filters = ['t.user_id = $1'];
  const params: unknown[] = [userId];

  if (query.pillar) {
    params.push(`%${query.pillar.trim()}%`);
    filters.push(`(cp.code ILIKE $${params.length} OR cp.name ILIKE $${params.length})`);
  }

  if (query.trait) {
    params.push(`%${query.trait.trim()}%`);
    filters.push(`(ct.code ILIKE $${params.length} OR ct.name ILIKE $${params.length})`);
  }

  if (query.q) {
    params.push(`%${query.q.trim()}%`);
    const idx = params.length;
    filters.push(`(t.task ILIKE $${idx} OR ct.name ILIKE $${idx} OR cp.name ILIKE $${idx})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await pool.query<TaskRow>(
    `SELECT t.task_id,
            t.task,
            cp.name AS pillar_name,
            cp.code AS pillar_code,
            ct.name AS trait_name,
            ct.code AS trait_code,
            cd.name AS difficulty_name,
            cd.code AS difficulty_code,
            t.created_at,
            t.active
       FROM tasks t
  LEFT JOIN cat_trait ct ON ct.trait_id = t.trait_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      ${whereClause}
   ORDER BY t.created_at DESC`,
    params,
  );

  const items: AdminTask[] = result.rows.map((row) => ({
    taskId: row.task_id,
    taskName: row.task ?? 'Tarea sin nombre',
    pillar: row.pillar_name ?? row.pillar_code ?? '—',
    trait: row.trait_name ?? row.trait_code ?? '—',
    difficulty: row.difficulty_name ?? row.difficulty_code ?? '—',
    weeklyTarget: null,
    createdAt: formatDate(row.created_at),
    archived: row.active === false,
  }));

  return {
    items,
    page: 1,
    pageSize: items.length || 1,
    total: items.length,
  };
}

export async function updateUserTask(
  _userId: string,
  _taskId: string,
  _body: UpdateTaskBody,
): Promise<{ ok: true }> {
  void _userId;
  void _taskId;
  void _body;
  // TODO: Implement task editing once the admin workflow is finalized.
  return { ok: true };
}

export async function exportUserLogsCsv(userId: string, query: LogsQuery): Promise<string> {
  const result = await getUserLogs(userId, query);

  const header = [
    'date',
    'week',
    'pillar',
    'trait',
    'stat',
    'taskId',
    'taskName',
    'difficulty',
    'xp',
    'state',
    'timesInRange',
    'source',
    'notes',
  ];

  const rows = result.items.map((item) =>
    [
      item.date,
      item.week,
      item.pillar,
      item.trait,
      item.stat ?? '',
      item.taskId,
      item.taskName,
      item.difficulty,
      String(item.xp),
      item.state,
      String(item.timesInRange),
      item.source,
      item.notes ?? '',
    ]
      .map((value) => value.replace(/"/g, '""'))
      .map((value) => (value.includes(',') ? `"${value}"` : value))
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
}
