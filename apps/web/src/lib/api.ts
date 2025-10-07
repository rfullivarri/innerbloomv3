import { logApiDebug, logApiError } from './logger';

function logShape(tag: string, value: unknown) {
  try {
    const shape = Array.isArray(value)
      ? {
          isArray: true,
          length: value.length,
          sample: value
            .slice(0, 3)
            .map((entry) => Object.fromEntries(Object.entries((entry as Record<string, unknown>) ?? {}).slice(0, 8))),
        }
      : {
          isArray: false,
          keys: Object.keys((value as Record<string, unknown>) ?? {}).slice(0, 10),
        };

    if (typeof window === 'undefined' || (window as any).__DBG !== false) {
      console.info(`[SHAPE] ${tag}`, shape);
    }
  } catch (error) {
    console.warn('[SHAPE] failed to log shape', { tag, error });
  }
}

function extractArray<T>(source: any, ...keys: string[]): T[] {
  if (Array.isArray(source)) {
    return source as T[];
  }

  for (const key of keys) {
    const value = source?.[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}

const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '').trim();

function normalizeBaseUrl(value: string): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const withProtocol = hasProtocol ? trimmed : `https://${trimmed}`;

  try {
    const normalized = new URL(withProtocol);
    return `${normalized.origin}${normalized.pathname.replace(/\/+$/, '')}`;
  } catch (error) {
    logApiError('Failed to normalize API base URL', { value, error });
    return '';
  }
}

export const API_BASE = normalizeBaseUrl(RAW_API_BASE_URL);

console.info('[API] BASE =', API_BASE);

if (API_BASE) {
  logApiDebug('API base URL configured', { raw: RAW_API_BASE_URL, normalized: API_BASE });
}

function ensureBase(): string {
  if (!API_BASE) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL (or legacy VITE_API_URL) to continue.');
  }
  return API_BASE;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const base = ensureBase();
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, `${base}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function resolveApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return buildUrl(path);
}

export async function apiGet<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const url = resolveApiUrl(path);
  console.info('[API] → GET', url, { headers: Array.from(headers.keys()) });
  logApiDebug('API request', { path, url, init: { ...rest, headers: Object.fromEntries(headers.entries()) } });

  try {
    const response = await fetch(url, {
      ...rest,
      method: 'GET',
      headers,
    });

    logApiDebug('API response received', { url, status: response.status });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMessage = `Request failed with ${response.status}: ${text || response.statusText}`;
      logApiError('API request failed', { url, status: response.status, body: text });
      throw new Error(errorMessage);
    }

    const json = (await response.json()) as T;
    logApiDebug('API response parsed', { url, data: json });
    return json;
  } catch (error) {
    logApiError('API request threw', { url, error });
    throw error;
  }
}

async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path, params);
  return apiGet<T>(url, init);
}

export type ProgressSummary = {
  userId: string;
  totalXp: number;
  level: number;
  nextLevelXp?: number;
  xpIntoLevel?: number;
  xpToNextLevel?: number;
  nextLevelLabel?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const clone = new Date(date);
  clone.setUTCDate(clone.getUTCDate() + days);
  return clone;
}

function enumerateDateKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  for (let cursor = new Date(from); cursor <= to; cursor = addUtcDays(cursor, 1)) {
    keys.push(formatDateKey(cursor));
  }
  return keys;
}

export async function getProgress(userId: string): Promise<ProgressSummary> {
  const level = await getUserLevel(userId);

  const totalXp = toNumber(level.xp_total, 0);
  const currentLevel = toNumber(level.current_level, 0);
  const xpRequiredCurrent = toNumber(level.xp_required_current, 0);
  const xpRequiredNext = level.xp_required_next == null ? undefined : toNumber(level.xp_required_next, 0);
  const xpToNext = level.xp_to_next == null ? undefined : Math.max(0, toNumber(level.xp_to_next, 0));

  const xpIntoLevel = xpRequiredNext != null && xpToNext != null
    ? Math.max(0, xpRequiredNext - xpToNext)
    : Math.max(0, totalXp - xpRequiredCurrent);

  return {
    userId,
    totalXp,
    level: currentLevel,
    nextLevelXp: xpRequiredNext,
    xpIntoLevel,
    xpToNextLevel: xpToNext,
    nextLevelLabel: xpRequiredNext != null ? `Level ${currentLevel + 1}` : undefined,
  };
}

export type StreakSummary = {
  userId: string;
  current: number;
  longest: number;
  updatedAt?: string;
};

export async function getStreaks(userId: string): Promise<StreakSummary> {
  const today = new Date();
  const rangeEnd = formatDateKey(today);
  const rangeStartDate = addUtcDays(today, -59);
  const rangeStart = formatDateKey(rangeStartDate);

  const dailyXp = await getUserDailyXp(userId, { from: rangeStart, to: rangeEnd });
  const xpByDate = new Map<string, number>();

  for (const point of dailyXp.series) {
    xpByDate.set(point.date, Math.max(0, toNumber(point.xp_day, 0)));
  }

  const allDates = enumerateDateKeys(rangeStartDate, today);

  let longest = 0;
  let currentRun = 0;

  for (const key of allDates) {
    const xp = xpByDate.get(key) ?? 0;
    if (xp > 0) {
      currentRun += 1;
      if (currentRun > longest) {
        longest = currentRun;
      }
    } else {
      currentRun = 0;
    }
  }

  let current = 0;
  let allowTrailingSkip = true;

  for (let index = allDates.length - 1; index >= 0; index -= 1) {
    const key = allDates[index];
    const xp = xpByDate.get(key) ?? 0;

    if (xp > 0) {
      current += 1;
      allowTrailingSkip = false;
      continue;
    }

    if (allowTrailingSkip) {
      allowTrailingSkip = false;
      continue;
    }

    break;
  }

  return {
    userId,
    current,
    longest,
    updatedAt: new Date().toISOString(),
  };
}

export type EmotionSnapshot = {
  date: string;
  mood?: string;
  intensity?: number;
  score?: number;
  value?: number;
  note?: string;
};

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalXp: number;
  rank: number;
};

export async function getLeaderboard(params: { limit?: number; offset?: number } = {}): Promise<LeaderboardEntry[]> {
  const response = await getJson<unknown>('/leaderboard', params);
  logShape('leaderboard', response);
  return extractArray<LeaderboardEntry>(response, 'users', 'items', 'data');
}

export type Pillar = {
  id: string;
  name: string;
  description?: string;
  score?: number;
  progress?: number;
  totalXp?: number;
  xp?: number;
  focusAreas?: string[];
};

export async function getPillars(): Promise<Pillar[]> {
  const response = await getJson<unknown>('/pillars');
  logShape('pillars', response);
  return extractArray<Pillar>(response, 'pillars', 'items', 'data');
}

export type UserTask = {
  task_id: string;
  task: string;
  pillar_id: string | null;
  trait_id: string | null;
  difficulty_id: string | null;
  xp_base: number;
  active: boolean;
};

type UserTasksResponse = {
  limit: number;
  offset: number;
  tasks: UserTask[];
};

export async function getTasks(userId: string): Promise<UserTask[]> {
  const response = await getJson<UserTasksResponse | UserTask[]>(`/users/${encodeURIComponent(userId)}/tasks`);
  logShape('tasks', response);
  return extractArray<UserTask>(response, 'tasks', 'items', 'data');
}

export type TaskLog = {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt?: string;
  doneAt?: string;
  xpAwarded?: number;
  pillar?: string;
  mode?: string;
};

export async function getTaskLogs(userId: string, params: { limit?: number } = {}): Promise<TaskLog[]> {
  const response = await getJson<unknown>('/task-logs', { ...params, userId });
  logShape('task-logs', response);
  return extractArray<TaskLog>(response, 'items', 'logs', 'data', 'task_logs');
}

type EmotionLogResponse = {
  from: string;
  to: string;
  emotions: Array<{ date: string; emotion_id: string | null }>;
};

const EMOTION_LABELS: Record<string, string> = {
  calm: 'Calma',
  calma: 'Calma',
  happiness: 'Felicidad',
  happy: 'Felicidad',
  felicidad: 'Felicidad',
  motivation: 'Motivación',
  motivacion: 'Motivación',
  motivated: 'Motivación',
  sadness: 'Tristeza',
  triste: 'Tristeza',
  ansiedad: 'Ansiedad',
  anxiety: 'Ansiedad',
  frustration: 'Frustración',
  frustracion: 'Frustración',
  tiredness: 'Cansancio',
  cansancio: 'Cansancio',
};

type EmotionQuery = {
  days?: number;
  from?: string;
  to?: string;
};

function buildEmotionQuery(params: EmotionQuery): Record<string, string> {
  const query: Record<string, string> = {};

  let { from, to } = params;
  const normalizedDays =
    params.days != null && Number.isFinite(params.days)
      ? Math.max(1, Math.floor(Number(params.days)))
      : null;

  if (!to && normalizedDays != null) {
    to = formatDateKey(new Date());
  }

  if (normalizedDays != null) {
    const reference = to ? new Date(to) : new Date();
    if (!Number.isNaN(reference.getTime())) {
      const start = new Date(reference);
      start.setUTCDate(start.getUTCDate() - (normalizedDays - 1));
      if (!from) {
        from = formatDateKey(start);
      }
      if (!to) {
        to = formatDateKey(reference);
      }
    }
  }

  if (from) {
    query.from = from;
  }

  if (to) {
    query.to = to;
  }

  return query;
}

export async function getEmotions(userId: string, params: EmotionQuery = {}): Promise<EmotionSnapshot[]> {
  const response = await getJson<EmotionLogResponse | { emotions?: unknown }>(
    `/users/${encodeURIComponent(userId)}/emotions`,
    buildEmotionQuery(params),
  );

  logShape('emotions', response);

  const emotions = extractArray<{ date: string; emotion_id: string | null }>(response, 'emotions');

  return emotions.map((entry) => {
    const rawId = entry.emotion_id;
    const normalized = rawId == null ? '' : String(rawId);
    const moodLabel = normalized ? EMOTION_LABELS[normalized.toLowerCase()] ?? normalized : undefined;

    return {
      date: entry.date,
      mood: moodLabel,
    };
  });
}

export type UserState = {
  date: string;
  mode: string;
  weekly_target: number;
  grace: {
    applied: boolean;
    unique_days: number;
  };
  pillars: {
    Body: {
      hp?: number;
      xp_today: number;
      xp_obj_day: number;
    };
    Mind: {
      focus?: number;
      xp_today: number;
      xp_obj_day: number;
    };
    Soul: {
      mood?: number;
      xp_today: number;
      xp_obj_day: number;
    };
  };
};

export async function getUserState(userId: string): Promise<UserState> {
  const response = await getJson<UserState>(`/users/${encodeURIComponent(userId)}/state`);
  logShape('user-state', response);
  return response;
}

export type EnergyTimeseriesPoint = {
  date: string;
  Body: number;
  Mind: number;
  Soul: number;
};

export async function getUserStateTimeseries(
  userId: string,
  params: { from: string; to: string },
): Promise<EnergyTimeseriesPoint[]> {
  const response = await getJson<unknown>(`/users/${encodeURIComponent(userId)}/state/timeseries`, params);
  logShape('user-state-timeseries', response);
  return extractArray<EnergyTimeseriesPoint>(response, 'series', 'items', 'data');
}

export type DailyXpPoint = {
  date: string;
  xp_day: number;
};

export type DailyXpResponse = {
  from: string;
  to: string;
  series: DailyXpPoint[];
};

export async function getUserDailyXp(
  userId: string,
  params: { from?: string; to?: string } = {},
): Promise<DailyXpResponse> {
  const response = await getJson<DailyXpResponse>(`/users/${encodeURIComponent(userId)}/xp/daily`, params);
  logShape('user-daily-xp', response);
  return response;
}

export type TraitXpEntry = {
  trait: string;
  xp: number;
};

export type UserXpByTraitResponse = {
  traits: TraitXpEntry[];
};

export async function getUserXpByTrait(
  userId: string,
  params: { from?: string; to?: string } = {},
): Promise<UserXpByTraitResponse> {
  const response = await getJson<unknown>(`/users/${encodeURIComponent(userId)}/xp/by-trait`, params);
  logShape('user-xp-by-trait', response);

  const traits = extractArray<TraitXpEntry>(response, 'traits', 'items', 'data').map((item) => ({
    trait: String((item as TraitXpEntry)?.trait ?? '').trim(),
    xp: Number((item as TraitXpEntry)?.xp ?? 0) || 0,
  }));

  return { traits };
}

export type CurrentUserProfile = {
  user_id: string;
  clerk_user_id: string;
  email_primary: string | null;
  full_name: string | null;
  image_url: string | null;
  game_mode: string | null;
  weekly_target: number | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type CurrentUserResponse = {
  user: CurrentUserProfile;
};

export async function getCurrentUserProfile(clerkUserId: string): Promise<CurrentUserProfile> {
  const response = await getJson<CurrentUserResponse>('/users/me', undefined, {
    headers: {
      'X-User-Id': clerkUserId,
    },
  });

  logShape('current-user', response);

  return response.user;
}

export type UserLevelResponse = {
  user_id: string;
  current_level: number;
  xp_total: number;
  xp_required_current: number;
  xp_required_next: number | null;
  xp_to_next: number | null;
  progress_percent: number;
};

export async function getUserLevel(userId: string): Promise<UserLevelResponse> {
  const response = await getJson<UserLevelResponse>(`/users/${encodeURIComponent(userId)}/level`);
  logShape('user-level', response);
  return response;
}

export type UserTotalXpResponse = {
  total_xp: number;
};

export async function getUserTotalXp(userId: string): Promise<UserTotalXpResponse> {
  const response = await getJson<UserTotalXpResponse>(`/users/${encodeURIComponent(userId)}/xp/total`);
  logShape('user-total-xp', response);
  return response;
}

export type UserJourneySummary = {
  first_date_log: string | null;
  days_of_journey: number;
  quantity_daily_logs: number;
};

export async function getUserJourney(userId: string): Promise<UserJourneySummary> {
  const response = await getJson<UserJourneySummary>(`/users/${encodeURIComponent(userId)}/journey`);
  logShape('user-journey', response);
  return response;
}
