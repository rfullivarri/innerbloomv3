import Constants from 'expo-constants';
import type { MissionsV2BoardResponse } from '@innerbloom/missions-v2-contracts';
import type { GetTokenOptions } from '@clerk/types';

const fallbackBase = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ?? '';
const RAW_API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackBase ?? '').trim();
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public url: string,
  ) {
    super(typeof body === 'object' && body && 'message' in (body as Record<string, unknown>)
      ? String((body as Record<string, unknown>).message)
      : `HTTP ${status}`);
    this.name = 'ApiError';
  }
}

export type TokenProvider = () => Promise<string>;

export type GetTokenFn = (options?: GetTokenOptions) => Promise<string | null>;

export function createTokenProvider(getToken: GetTokenFn): TokenProvider {
  const template = (process.env.EXPO_PUBLIC_CLERK_TOKEN_TEMPLATE ?? '').trim() || undefined;
  return async () => {
    const token = template ? await getToken({ template }) : await getToken();
    if (!token) {
      throw new Error('Missing Clerk session token');
    }
    return token;
  };
}

function ensureBase(): string {
  if (!API_BASE) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }
  return API_BASE;
}

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function normalizeApiPath(path: string): string {
  const trimmed = path.trim();
  if (isAbsoluteUrl(trimmed)) {
    return trimmed;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (withLeadingSlash.startsWith('/api')) {
    return withLeadingSlash;
  }
  return `/api${withLeadingSlash}`;
}

function applySearchParams(url: URL, params?: Record<string, string | number | boolean | undefined>) {
  if (!params) {
    return;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = ensureBase();
  if (isAbsoluteUrl(path.trim())) {
    const url = new URL(path);
    applySearchParams(url, params);
    return url.toString();
  }
  const normalizedPath = normalizeApiPath(path);
  const origin = base.endsWith('/') ? base : `${base}/`;
  const url = new URL(normalizedPath.replace(/^\//, ''), origin);
  applySearchParams(url, params);
  return url.toString();
}

type RequestOptions = {
  method?: string;
  body?: Record<string, unknown> | undefined;
  headers?: HeadersInit | undefined;
  params?: Record<string, string | number | boolean | undefined>;
};

async function authorizedRequest<T>(
  tokenProvider: TokenProvider,
  path: string,
  { method = 'GET', body, headers: extraHeaders, params }: RequestOptions = {},
): Promise<T> {
  const token = await tokenProvider();
  const url = buildApiUrl(path, params);
  const headers = new Headers(extraHeaders ?? {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  headers.set('Authorization', `Bearer ${token}`);

  let serializedBody: BodyInit | undefined;
  if (body) {
    headers.set('Content-Type', 'application/json');
    serializedBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: serializedBody,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parsed, url);
  }

  return parsed as T;
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

export type DailyReminderSettingsResponse = {
  user_daily_reminder_id?: string | null;
  reminder_id?: string | null;
  channel?: string | null;
  local_time?: string | null;
  localTime?: string | null;
  timezone?: string | null;
  timeZone?: string | null;
  time_zone?: string | null;
  status?: 'active' | 'paused' | 'disabled' | null;
  enabled?: boolean | null;
  last_sent_at?: string | null;
  delivery_strategy?: string | null;
};

export type DailyQuestStatusResponse = {
  date: string;
  submitted: boolean;
  submitted_at: string | null;
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
  emotionOptions: Array<{
    emotion_id: number;
    code: string;
    name: string;
  }>;
  pillars: Array<{
    pillar_code: string;
    tasks: DailyQuestTaskDefinition[];
  }>;
};

export type UserTask = {
  id: string;
  title: string;
  pillarId: string | null;
  traitId: string | null;
  statId: string | null;
  difficultyId: string | null;
  isActive: boolean;
  xp: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
};

type RawUserTask = Record<string, unknown>;

type UserTasksResponse = {
  tasks?: RawUserTask[];
  items?: RawUserTask[];
  data?: RawUserTask[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function pickNumber(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    if (['1', 'true', 'yes', 'active', 'enabled', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'inactive', 'disabled', 'off'].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

function normalizeUserTask(raw: RawUserTask): UserTask {
  const fallbackId = `task-${Math.random().toString(36).slice(2)}`;
  const id = pickString(raw.id) ?? pickString((raw as Record<string, unknown>).task_id) ?? fallbackId;
  const created = pickString(raw.created_at ?? raw.createdAt ?? raw.created);
  const updated = pickString(raw.updated_at ?? raw.updatedAt ?? raw.updated);
  const completed = pickString(raw.completed_at ?? raw.completedAt ?? raw.completed);
  const archived = pickString(raw.archived_at ?? raw.archivedAt ?? raw.archived);
  const xp = pickNumber(raw.xp ?? raw.reward_xp ?? raw.rewardXp);
  const isActive = pickBoolean(raw.is_active ?? raw.active ?? raw.enabled, true);
  return {
    id,
    title: pickString(raw.title) ?? 'Tarea sin nombre',
    pillarId: pickString(raw.pillar_id ?? raw.pillarId),
    traitId: pickString(raw.trait_id ?? raw.traitId),
    statId: pickString(raw.stat_id ?? raw.statId),
    difficultyId: pickString(raw.difficulty_id ?? raw.difficultyId),
    isActive,
    xp,
    createdAt: created,
    updatedAt: updated,
    completedAt: completed,
    archivedAt: archived,
  } satisfies UserTask;
}

function normalizeUserTaskList(source: UserTasksResponse | RawUserTask[] | null | undefined): UserTask[] {
  if (!source) {
    return [];
  }
  if (Array.isArray(source)) {
    return source.filter(isRecord).map((item) => normalizeUserTask(item));
  }
  const { tasks, items, data } = source;
  const fromTasks = Array.isArray(tasks) ? tasks.filter(isRecord) : [];
  const fromItems = Array.isArray(items) ? items.filter(isRecord) : [];
  const fromData = Array.isArray(data) ? data.filter(isRecord) : [];
  const merged = [...fromTasks, ...fromItems, ...fromData];
  return merged.map((entry) => normalizeUserTask(entry));
}

export async function fetchCurrentUserProfile(tokenProvider: TokenProvider): Promise<CurrentUserProfile> {
  const response = await authorizedRequest<{ user: CurrentUserProfile }>(tokenProvider, '/users/me');
  return response.user;
}

export async function fetchDailyQuestDefinition(
  tokenProvider: TokenProvider,
  params: { date?: string } = {},
): Promise<DailyQuestDefinitionResponse> {
  return authorizedRequest<DailyQuestDefinitionResponse>(tokenProvider, '/daily-quest/definition', {
    params,
  });
}

export async function fetchMissionsBoard(tokenProvider: TokenProvider): Promise<MissionsV2BoardResponse> {
  return authorizedRequest<MissionsV2BoardResponse>(tokenProvider, '/missions/board');
}

export async function fetchDailyReminderSettings(
  tokenProvider: TokenProvider,
  channel = 'email',
): Promise<DailyReminderSettingsResponse> {
  return authorizedRequest<DailyReminderSettingsResponse>(tokenProvider, '/me/daily-reminder', {
    params: { channel },
  });
}

export async function fetchUserTasks(
  tokenProvider: TokenProvider,
  userId: string,
): Promise<UserTask[]> {
  const response = await authorizedRequest<UserTasksResponse | RawUserTask[]>(
    tokenProvider,
    `/users/${encodeURIComponent(userId)}/tasks`,
  );
  return normalizeUserTaskList(response);
}
