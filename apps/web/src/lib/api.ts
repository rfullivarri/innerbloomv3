import { apiLog, logApiDebug, logApiError } from './logger';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: any,
    public url: string,
    public requestId?: string,
  ) {
    super(body?.message || `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, init);

    logApiDebug('API response received', { url, status: res.status });

    if (!res.ok) {
      const body = await safeJson(res);
      const requestId =
        res.headers.get('x-railway-request-id') || res.headers.get('x-request-id') || undefined;

      apiLog('[API] request failed', {
        url,
        status: res.status,
        code: body?.code,
        message: body?.message,
        requestId,
      });

      throw new ApiError(res.status, body, url, requestId);
    }

    const json = (await res.json()) as T;
    logApiDebug('API response parsed', { url, data: json });
    return json;
  } catch (err) {
    if (!(err instanceof ApiError)) {
      apiLog('[API] request threw', {
        url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
}

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

type AuthTokenProvider = () => Promise<string | null>;

type AuthProviderWaiter = {
  timeoutId: ReturnType<typeof setTimeout>;
  resolve: (provider: AuthTokenProvider) => void;
};

type AuthProviderListener = (provider: AuthTokenProvider | null) => void;

const AUTH_PROVIDER_TIMEOUT_MS = 5_000;

let authTokenProvider: AuthTokenProvider | null = null;
const authProviderWaiters: AuthProviderWaiter[] = [];
const authProviderListeners = new Set<AuthProviderListener>();

function notifyAuthProviderChange(provider: AuthTokenProvider | null) {
  for (const listener of authProviderListeners) {
    try {
      listener(provider);
    } catch (error) {
      logApiError('Auth provider listener failed', { error });
    }
  }
}

export function onApiAuthTokenProviderChange(listener: AuthProviderListener): () => void {
  authProviderListeners.add(listener);
  return () => {
    authProviderListeners.delete(listener);
  };
}

export function isApiAuthTokenProviderReady(): boolean {
  return authTokenProvider !== null;
}

export function setApiAuthTokenProvider(provider: AuthTokenProvider | null) {
  authTokenProvider = provider;

  if (!provider) {
    notifyAuthProviderChange(null);
    return;
  }

  const waiters = authProviderWaiters.splice(0, authProviderWaiters.length);
  for (const waiter of waiters) {
    clearTimeout(waiter.timeoutId);
    waiter.resolve(provider);
  }

  notifyAuthProviderChange(provider);
}

async function resolveAuthToken(): Promise<string> {
  const provider = authTokenProvider;

  if (provider) {
    const token = await provider();
    if (!token) {
      throw new Error('Missing Clerk session token for API request.');
    }
    return token;
  }

  const awaitedProvider = await new Promise<AuthTokenProvider>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const index = authProviderWaiters.findIndex((waiter) => waiter.timeoutId === timeoutId);
      if (index >= 0) {
        authProviderWaiters.splice(index, 1);
      }
      reject(new Error('Auth token provider is not ready.'));
    }, AUTH_PROVIDER_TIMEOUT_MS);

    authProviderWaiters.push({
      timeoutId,
      resolve: (nextProvider) => {
        clearTimeout(timeoutId);
        resolve(nextProvider);
      },
    });
  });

  const token = await awaitedProvider();
  if (!token) {
    throw new Error('Missing Clerk session token for API request.');
  }

  return token;
}

function applyAuthorization(init: RequestInit | undefined, authToken: string): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  return {
    ...(init ?? {}),
    headers,
  };
}

const RAW_API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '').trim();

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('//');
}

function normalizeBaseUrl(value: string): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  let absolute = trimmed;

  if (trimmed.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      absolute = `${window.location.origin}${trimmed}`;
    } else {
      logApiError('Cannot resolve relative API URL without window.location', { value });
      return '';
    }
  } else if (trimmed.startsWith('//')) {
    const protocol = typeof window !== 'undefined' && window.location?.protocol
      ? window.location.protocol
      : 'https:';
    absolute = `${protocol}${trimmed}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    const looksLikeLocalhost = /^localhost(?![^:/])|^\d{1,3}(?:\.\d{1,3}){3}(?![^:/])/i.test(trimmed);
    const protocol = looksLikeLocalhost ? 'http://' : 'https://';
    absolute = `${protocol}${trimmed}`;
  }

  try {
    const normalized = new URL(absolute);
    const path = normalized.pathname.replace(/\/+$/, '');
    return `${normalized.origin}${path}`;
  } catch (error) {
    logApiError('Failed to normalize API base URL', { value, absolute, error });
    return '';
  }
}

type NormalizedApiTarget = {
  path: string;
  isAbsolute: boolean;
};

function normalizeApiTarget(path: string): NormalizedApiTarget {
  const trimmed = String(path ?? '').trim();

  if (!trimmed) {
    throw new Error('API path must be a non-empty string.');
  }

  if (isAbsoluteUrl(trimmed)) {
    return { path: trimmed, isAbsolute: true };
  }

  const placeholder = new URL(trimmed, 'https://placeholder.local');
  let pathname = placeholder.pathname || '/';
  const search = placeholder.search;
  const hash = placeholder.hash;

  if (!/^\/api(?:\/|$)/.test(pathname)) {
    pathname = pathname === '/' ? '/api' : `/api${pathname}`;
  }

  return {
    path: `${pathname}${search}${hash}`,
    isAbsolute: false,
  };
}

function applySearchParams(url: URL, params?: Record<string, string | number | undefined>) {
  if (!params) {
    return;
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
}

function resolveRuntimeOrigin(): string | null {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  const globalLocation = typeof globalThis !== 'undefined' ? (globalThis as { location?: Location }) : undefined;
  if (!globalLocation?.location) {
    return null;
  }

  const { location } = globalLocation;

  if (typeof location.origin === 'string' && location.origin) {
    return location.origin;
  }

  if (typeof location.href === 'string' && location.href) {
    try {
      return new URL(location.href).origin;
    } catch (error) {
      logApiError('Failed to resolve origin from global location href', { href: location.href, error });
    }
  }

  return null;
}

function resolveApiBase(): string {
  const configured = normalizeBaseUrl(RAW_API_BASE_URL);
  if (configured) {
    return configured;
  }

  const fallbackOrigin = resolveRuntimeOrigin();
  if (fallbackOrigin) {
    const normalizedFallback = normalizeBaseUrl(fallbackOrigin);
    if (normalizedFallback) {
      logApiDebug('API base URL fallback', { origin: fallbackOrigin });
      return normalizedFallback;
    }
  }

  return '';
}

export const API_BASE = resolveApiBase();

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
  const target = normalizeApiTarget(path);

  const url = target.isAbsolute
    ? new URL(target.path, `${base}/`)
    : new URL(target.path.startsWith('/') ? target.path.slice(1) : target.path, `${base}/`);

  applySearchParams(url, params);

  return url.toString();
}

function resolveApiUrl(path: string): string {
  return buildUrl(path);
}

export function buildApiUrl(path: string, params?: Record<string, string | number | undefined>) {
  return buildUrl(path, params);
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

  return apiRequest<T>(url, {
    ...rest,
    method: 'GET',
    headers,
  });
}

async function getJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init: RequestInit = {},
): Promise<T> {
  const url = buildUrl(path, params);
  return apiGet<T>(url, init);
}

async function getAuthorizedJson<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<T> {
  const token = await resolveAuthToken();
  const authedInit = applyAuthorization(init, token);
  return getJson<T>(path, params, authedInit);
}

export async function apiAuthorizedGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<T> {
  return getAuthorizedJson<T>(path, params, init);
}

export async function apiAuthorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await resolveAuthToken();
  const authedInit = applyAuthorization(init, token);
  const url = resolveApiUrl(path);
  return fetch(url, authedInit);
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

export type AchievementProgress = {
  current: number;
  target: number;
  pct: number;
};

export type Achievement = {
  id: string;
  name: string;
  earnedAt: string | null;
  progress: AchievementProgress;
  description?: string;
  status?: string;
  unlockedAt?: string | null;
  category?: string;
  icon?: string;
};

export type AchievementSummary = {
  userId: string;
  achievements: Achievement[];
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

type RawAchievement = Record<string, unknown> & {
  id?: string;
  name?: string;
  title?: string;
  label?: string;
  description?: string;
  status?: string;
  category?: string;
  icon?: string;
  earned_at?: string | null;
  unlocked_at?: string | null;
  completed_at?: string | null;
  achieved_at?: string | null;
  progress?: {
    current?: number | string | null;
    target?: number | string | null;
    goal?: number | string | null;
    pct?: number | string | null;
    percent?: number | string | null;
    progress?: number | string | null;
    value?: number | string | null;
    total?: number | string | null;
  } | null;
};

type RawAchievementResponse = {
  user_id?: string;
  achievements?: RawAchievement[];
};

function normalizeAchievement(raw: RawAchievement, index: number): Achievement {
  const fallbackId = raw.id ?? raw.name ?? `achievement-${index + 1}`;
  const record = raw as Record<string, unknown>;
  const nameSource = raw.name ?? raw.title ?? raw.label ?? record.achievement_name;
  const rawName = typeof nameSource === 'string' && nameSource.trim().length > 0 ? nameSource : null;
  const derivedName =
    rawName ?? (typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : `Achievement ${index + 1}`);

  const unlockedAtSources = [raw.unlocked_at, raw.completed_at, raw.achieved_at, record.unlockedAt];
  const unlockedAtValue = unlockedAtSources.find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  ) as string | undefined;

  const earnedAtSources = [raw.earned_at, record.earnedAt, unlockedAtValue];
  const earnedAtValue = earnedAtSources.find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  ) as string | undefined;

  const progressSource = (raw.progress ?? {}) as Record<string, unknown>;
  const progressCurrentRaw =
    progressSource.current ??
    progressSource.value ??
    progressSource.progress ??
    record.current ??
    record.progress ??
    record.progress_current ??
    record.progressCurrent ??
    record.value ??
    null;

  const progressTargetRaw =
    progressSource.target ??
    progressSource.goal ??
    progressSource.total ??
    record.target ??
    record.total ??
    record.progress_target ??
    record.progressTarget ??
    record.goal ??
    null;

  const progressPctRaw =
    progressSource.pct ??
    progressSource.percent ??
    record.pct ??
    record.percent ??
    record.progress_pct ??
    record.progressPct ??
    null;

  const current = toNumber(progressCurrentRaw, 0);
  const target = Math.max(0, toNumber(progressTargetRaw, 0));
  const pctBase = target === 0 ? (current > 0 ? 100 : 0) : Math.min(100, Math.max(0, (current / target) * 100));
  const pct =
    progressPctRaw == null
      ? pctBase
      : Math.min(100, Math.max(0, toNumber(progressPctRaw, pctBase)));

  const descriptionSource = raw.description ?? record.details ?? record.summary;
  const statusSource = raw.status ?? record.state ?? record.phase;
  const categorySource = raw.category ?? record.pillar ?? record.group;
  const iconSource = raw.icon ?? record.badge ?? record.image;

  return {
    id: String(fallbackId ?? `achievement-${index + 1}`),
    name: derivedName,
    earnedAt: typeof earnedAtValue === 'string' ? earnedAtValue : null,
    unlockedAt: typeof unlockedAtValue === 'string' ? unlockedAtValue : null,
    description: typeof descriptionSource === 'string' ? descriptionSource : undefined,
    status: typeof statusSource === 'string' ? statusSource : undefined,
    category: typeof categorySource === 'string' ? categorySource : undefined,
    icon: typeof iconSource === 'string' ? iconSource : undefined,
    progress: {
      current,
      target,
      pct,
    },
  };
}

export async function getAchievements(userId: string): Promise<AchievementSummary> {
  const response = await getAuthorizedJson<RawAchievementResponse>(
    `/users/${encodeURIComponent(userId)}/achievements`,
  );
  logShape('achievements', response);

  const achievements = Array.isArray(response.achievements) ? response.achievements : [];

  return {
    userId: response.user_id ?? userId,
    achievements: achievements.map((achievement, index) => normalizeAchievement(achievement, index)),
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

export async function getPillars(userId: string): Promise<Pillar[]> {
  const response = await getAuthorizedJson<unknown>(`/users/${encodeURIComponent(userId)}/pillars`);
  logShape('pillars', response);
  return extractArray<Pillar>(response, 'pillars', 'items', 'data');
}

export type TodaySummary = {
  xpToday: number;
  quests: {
    total: number;
    completed: number;
  };
};

export async function getTodaySummary(userId: string): Promise<TodaySummary> {
  const response = await getAuthorizedJson<Record<string, unknown>>(
    `/users/${encodeURIComponent(userId)}/summary/today`,
  );
  logShape('today-summary', response);

  const quests = (response?.quests ?? {}) as Record<string, unknown>;
  const questsTotalRaw = quests.total ?? quests.available ?? quests.count;
  const questsCompletedRaw = quests.completed ?? quests.done ?? quests.progress;

  return {
    xpToday: toNumber(response?.xp_today ?? response?.xpToday ?? response?.xp ?? 0, 0),
    quests: {
      total: Math.max(0, toNumber(questsTotalRaw ?? 0, 0)),
      completed: Math.max(0, toNumber(questsCompletedRaw ?? 0, 0)),
    },
  };
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
  const response = await getAuthorizedJson<UserTasksResponse | UserTask[]>(
    `/users/${encodeURIComponent(userId)}/tasks`,
  );
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

type EmotionLogEntry = {
  date?: string | null;
  day?: string | null;
  emotion_id?: string | number | null;
  emotion?: string | null;
  mood?: string | null;
  emocion?: string | null;
  intensity?: number | null;
  score?: number | null;
  value?: number | null;
  note?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  timestamp?: string | number | null;
};

type EmotionLogResponse = {
  emotions?: EmotionLogEntry[];
  days?: EmotionLogEntry[];
  daily_emotion?: EmotionLogEntry[];
  data?: EmotionLogResponse;
};

const EMOTION_LABELS: Record<string, string> = {
  '1': 'Calma',
  '2': 'Felicidad',
  '3': 'Motivación',
  '4': 'Tristeza',
  '5': 'Ansiedad',
  '6': 'Frustración',
  '7': 'Cansancio',
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

function resolveEmotionEntries(source: EmotionLogResponse | EmotionLogEntry[] | undefined): EmotionLogEntry[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source;
  }

  const direct = extractArray<EmotionLogEntry>(source, 'days', 'emotions', 'daily_emotion');
  if (direct.length > 0) {
    return direct;
  }

  if (source.data) {
    return resolveEmotionEntries(source.data);
  }

  return [];
}

function normalizeEmotionLabel(raw: unknown): string | undefined {
  if (raw == null) {
    return undefined;
  }

  const normalized = String(raw).trim();
  if (!normalized) {
    return undefined;
  }

  return EMOTION_LABELS[normalized.toLowerCase()] ?? normalized;
}

function normalizeEmotionDate(raw: unknown): string | null {
  if (!raw && raw !== 0) {
    return null;
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateKey(parsed);
    }

    return null;
  }

  if (raw instanceof Date) {
    return formatDateKey(raw);
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateKey(parsed);
    }
  }

  return null;
}

export async function getEmotions(userId: string, params: EmotionQuery = {}): Promise<EmotionSnapshot[]> {
  const response = await getAuthorizedJson<
    EmotionLogResponse | EmotionLogEntry[] | { emotions?: unknown; days?: unknown }
  >(`/users/${encodeURIComponent(userId)}/emotions`, buildEmotionQuery(params));

  logShape('emotions', response);

  const entries = resolveEmotionEntries(response as EmotionLogResponse | EmotionLogEntry[] | undefined);

  return entries
    .map((entry) => {
      const date =
        normalizeEmotionDate(entry.date) ??
        normalizeEmotionDate(entry.day) ??
        normalizeEmotionDate((entry as Record<string, unknown>)?.created_at) ??
        normalizeEmotionDate((entry as Record<string, unknown>)?.createdAt) ??
        normalizeEmotionDate((entry as Record<string, unknown>)?.timestamp);

      if (!date) {
        return null;
      }

      const mood =
        normalizeEmotionLabel(entry.emotion) ??
        normalizeEmotionLabel(entry.mood) ??
        normalizeEmotionLabel(entry.emocion) ??
        normalizeEmotionLabel(entry.emotion_id);

      const intensityValue = Number(entry.intensity);
      const scoreValue = Number(entry.score);
      const valueValue = Number(entry.value);
      const derivedIntensity = [intensityValue, scoreValue, valueValue].find((candidate) => Number.isFinite(candidate));
      const note = typeof entry.note === 'string' ? entry.note : undefined;

      const snapshot: EmotionSnapshot = {
        date,
        ...(mood ? { mood } : {}),
        ...(Number.isFinite(intensityValue) ? { intensity: intensityValue } : {}),
        ...(Number.isFinite(scoreValue) ? { score: scoreValue } : {}),
        ...(Number.isFinite(valueValue) ? { value: valueValue } : {}),
        ...(note ? { note } : {}),
      };

      if (snapshot.intensity === undefined && derivedIntensity !== undefined) {
        snapshot.intensity = derivedIntensity;
      }

      return snapshot;
    })
    .filter((entry): entry is EmotionSnapshot => entry !== null);
}

export type UserState = {
  date: string;
  mode: string;
  mode_name?: string;
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
  const response = await getAuthorizedJson<UserState>(`/users/${encodeURIComponent(userId)}/state`);
  logShape('user-state', response);
  return response;
}

export type DailyEnergySnapshot = {
  user_id: string;
  hp_pct: number;
  mood_pct: number;
  focus_pct: number;
  hp_norm: number;
  mood_norm: number;
  focus_norm: number;
};

export async function getUserDailyEnergy(userId: string): Promise<DailyEnergySnapshot | null> {
  try {
    const response = await getAuthorizedJson<DailyEnergySnapshot>(
      `/users/${encodeURIComponent(userId)}/daily-energy`,
    );
    logShape('user-daily-energy', response);
    return response;
  } catch (error) {
    if (error instanceof Error && /404/.test(error.message)) {
      logApiDebug('user-daily-energy not found', { userId, message: error.message });
      return null;
    }

    throw error;
  }
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
  const response = await getAuthorizedJson<unknown>(`/users/${encodeURIComponent(userId)}/state/timeseries`, params);
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
  const response = await getAuthorizedJson<DailyXpResponse>(
    `/users/${encodeURIComponent(userId)}/xp/daily`,
    params,
  );
  logShape('user-daily-xp', response);
  return response;
}

export type TraitXpEntry = {
  trait: string;
  name?: string;
  xp: number;
};

export type UserXpByTraitResponse = {
  traits: TraitXpEntry[];
};

export async function getUserXpByTrait(
  userId: string,
  params: { from?: string; to?: string } = {},
): Promise<UserXpByTraitResponse> {
  const response = await getAuthorizedJson<unknown>(`/users/${encodeURIComponent(userId)}/xp/by-trait`, params);
  logShape('user-xp-by-trait', response);

  const traits = extractArray<Record<string, unknown>>(response, 'traits', 'items', 'data').map((item) => {
    const traitValue =
      item?.trait ??
      item?.trait_code ??
      item?.code ??
      item?.traitId ??
      item?.trait_id ??
      item?.id ??
      '';

    const nameValue = item?.name ?? item?.trait_name ?? item?.label ?? item?.display_name ?? '';
    const xpValue = item?.xp ?? item?.total ?? item?.value ?? 0;

    const trait = String(traitValue ?? '').trim();
    const name = String(nameValue ?? '').trim();
    const xp = Number(xpValue ?? 0);

    return {
      trait,
      name: name.length > 0 ? name : undefined,
      xp: Number.isFinite(xp) ? xp : 0,
    } satisfies TraitXpEntry;
  });

  return { traits };
}

export type StreakPanelPillar = 'Body' | 'Mind' | 'Soul';
export type StreakPanelRange = 'week' | 'month' | 'qtr';

export type StreakPanelTopEntry = {
  id: string;
  name: string;
  stat: string;
  weekDone: number;
  streakDays: number;
};

export type StreakPanelTask = {
  id: string;
  name: string;
  stat: string;
  weekDone: number;
  streakDays: number;
  metrics: {
    week: { count: number; xp: number };
    month: { count: number; xp: number; weeks: number[] };
    qtr: { count: number; xp: number; weeks: number[] };
  };
};

export type StreakPanelResponse = {
  topStreaks: StreakPanelTopEntry[];
  tasks: StreakPanelTask[];
};

export async function getUserStreakPanel(
  userId: string,
  params: { pillar: StreakPanelPillar; range: StreakPanelRange; mode?: string; query?: string },
): Promise<StreakPanelResponse> {
  const normalized: Record<string, string | undefined> = {
    pillar: params.pillar,
    range: params.range,
    mode: params.mode,
    query: params.query?.trim() ? params.query.trim() : undefined,
  };

  const response = await getAuthorizedJson<StreakPanelResponse>(
    `/users/${encodeURIComponent(userId)}/streaks/panel`,
    normalized,
  );

  logShape('user-streak-panel', response);
  return response;
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

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  const response = await getAuthorizedJson<CurrentUserResponse>('/users/me');

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
  const response = await getAuthorizedJson<UserLevelResponse>(`/users/${encodeURIComponent(userId)}/level`);
  logShape('user-level', response);
  return response;
}

export type UserTotalXpResponse = {
  total_xp: number;
};

export async function getUserTotalXp(userId: string): Promise<UserTotalXpResponse> {
  const response = await getAuthorizedJson<UserTotalXpResponse>(`/users/${encodeURIComponent(userId)}/xp/total`);
  logShape('user-total-xp', response);
  return response;
}

export type UserJourneySummary = {
  first_date_log: string | null;
  days_of_journey: number;
  quantity_daily_logs: number;
  first_programmed: boolean;
};

export async function getUserJourney(userId: string): Promise<UserJourneySummary> {
  const response = await getAuthorizedJson<UserJourneySummary>(`/users/${encodeURIComponent(userId)}/journey`);
  logShape('user-journey', response);
  return response;
}

export type DailyQuestStatusResponse = {
  date: string;
  submitted: boolean;
  submitted_at: string | null;
};

export type DailyQuestEmotionOption = {
  emotion_id: number;
  code: string;
  name: string;
};

export type DailyQuestTaskDefinition = {
  task_id: string;
  name: string;
  trait_id: number | null;
  difficulty: string | null;
  difficulty_id: number | null;
  xp: number;
};

export type DailyQuestDefinitionResponse = DailyQuestStatusResponse & {
  emotionOptions: DailyQuestEmotionOption[];
  pillars: Array<{
    pillar_code: string;
    tasks: DailyQuestTaskDefinition[];
  }>;
};

export type SubmitDailyQuestResponse = {
  ok: true;
  saved: {
    emotion: { emotion_id: number; date: string; notes: string | null };
    tasks: { date: string; completed: string[] };
  };
  xp_delta: number;
  xp_total_today: number;
  streaks: { daily: number; weekly: number };
};

export type SubmitDailyQuestPayload = {
  date?: string;
  emotion_id: number;
  tasks_done: string[];
  notes?: string | null;
};

export async function getDailyQuestStatus(params: { date?: string } = {}): Promise<DailyQuestStatusResponse> {
  const response = await getAuthorizedJson<DailyQuestStatusResponse>('/daily-quest/status', params);
  logShape('daily-quest-status', response);
  return response;
}

export async function getDailyQuestDefinition(
  params: { date?: string } = {},
): Promise<DailyQuestDefinitionResponse> {
  const response = await getAuthorizedJson<DailyQuestDefinitionResponse>('/daily-quest/definition', params);
  logShape('daily-quest-definition', response);
  return response;
}

export async function submitDailyQuest(payload: SubmitDailyQuestPayload): Promise<SubmitDailyQuestResponse> {
  const token = await resolveAuthToken();
  const url = buildUrl('/daily-quest/submit');
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  const body = {
    ...(payload.date ? { date: payload.date } : {}),
    emotion_id: payload.emotion_id,
    tasks_done: payload.tasks_done.map((taskId) => ({ task_id: taskId })),
    notes: payload.notes ?? null,
  };

  const init = applyAuthorization(
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    token,
  );

  const response = await apiRequest<SubmitDailyQuestResponse>(url, init);
  logShape('daily-quest-submit', response);
  return response;
}
