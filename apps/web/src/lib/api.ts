import { logApiDebug, logApiError } from './logger';

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

async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init: RequestInit = {},
): Promise<T> {
  const { headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const url = buildUrl(path, params);
  logApiDebug('API request', { path, params, url, init: { ...rest, headers: Object.fromEntries(headers.entries()) } });

  try {
    const response = await fetch(url, {
      ...rest,
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
  return getJson<LeaderboardEntry[]>('/leaderboard', params);
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
  return getJson<Pillar[]>('/pillars');
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
  const response = await getJson<UserTasksResponse>(`/users/${encodeURIComponent(userId)}/tasks`);
  return response.tasks ?? [];
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
  return getJson<TaskLog[]>('/task-logs', { ...params, userId });
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

export async function getEmotions(userId: string, params: { days?: number } = {}): Promise<EmotionSnapshot[]> {
  const response = await getJson<EmotionLogResponse>(`/users/${encodeURIComponent(userId)}/emotions`, params);

  return response.emotions.map((entry) => ({
    date: entry.date,
    mood: EMOTION_LABELS[String(entry.emotion_id ?? '').toLowerCase()] || entry.emotion_id || undefined,
  }));
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
  return getJson<UserState>(`/users/${encodeURIComponent(userId)}/state`);
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
  return getJson<EnergyTimeseriesPoint[]>(`/users/${encodeURIComponent(userId)}/state/timeseries`, params);
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
  return getJson<DailyXpResponse>(`/users/${encodeURIComponent(userId)}/xp/daily`, params);
}

export type CurrentUserProfile = {
  id: string;
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

export async function getCurrentUserProfile(clerkUserId: string): Promise<CurrentUserProfile> {
  return getJson<CurrentUserProfile>('/users/me', undefined, {
    headers: {
      'X-User-Id': clerkUserId,
    },
  });
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
  return getJson<UserLevelResponse>(`/users/${encodeURIComponent(userId)}/level`);
}

export type UserTotalXpResponse = {
  total_xp: number;
};

export async function getUserTotalXp(userId: string): Promise<UserTotalXpResponse> {
  return getJson<UserTotalXpResponse>(`/users/${encodeURIComponent(userId)}/xp/total`);
}

export type UserJourneySummary = {
  first_date_log: string | null;
  days_of_journey: number;
  quantity_daily_logs: number;
};

export async function getUserJourney(userId: string): Promise<UserJourneySummary> {
  return getJson<UserJourneySummary>(`/users/${encodeURIComponent(userId)}/journey`);
}
