import { apiLog, logApiDebug, logApiError } from './logger';
import type { WeeklyWrappedPayload } from './weeklyWrapped';
import { isDashboardDemoModeEnabled } from './demoMode';
import { isNativeCapacitorPlatform } from '../mobile/capacitor';
import {
  clearMobileAuthSession,
  ensureFreshMobileAuthSession,
  getMobileAuthSession,
  getMobileAuthTokenFingerprint,
} from '../mobile/mobileAuthSession';
import type {
  MissionsV2AbandonPayload,
  MissionsV2ActivatePayload,
  MissionsV2BoardResponse,
  MissionsV2ClaimPayload,
  MissionsV2ClaimResponse,
  MissionsV2HeartbeatPayload,
  MissionsV2HeartbeatResponse,
  MissionsV2LinkDailyResponse,
  MissionsV2MarketResponse,
  MissionsV2MarketSlot,
  MissionsV2Slot,
} from '@innerbloom/missions-v2-contracts';
export type {
  MissionsV2CommunicationType,
  MissionsV2SlotKey,
  MissionsV2MissionTask,
  MissionsV2Mission,
  MissionsV2ActionType,
  MissionsV2Action,
  MissionsV2Slot,
  MissionsV2Boss,
  MissionsV2Communication,
  MissionsV2BoardResponse,
  MissionsV2MarketProposalDifficulty,
  MissionsV2MarketProposal,
  MissionsV2MarketSlot,
  MissionsV2MarketResponse,
  MissionsV2ClaimResponse,
  MissionsV2HeartbeatResponse,
  MissionsV2LinkDailyResponse,
  MissionsV2ActivatePayload,
  MissionsV2AbandonPayload,
  MissionsV2HeartbeatPayload,
  MissionsV2ClaimPayload,
} from '@innerbloom/missions-v2-contracts';

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

function hasInvalidNativeMobileToken(body: any): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim().toLowerCase() : '';
  const causeCode = typeof body.details?.cause?.code === 'string'
    ? body.details.cause.code.trim().toUpperCase()
    : '';

  return (
    code === 'unauthorized'
    && (
      causeCode === 'ERR_JWT_EXPIRED'
      || causeCode === 'ERR_JWS_INVALID'
      || message.includes('invalid authentication token')
    )
  );
}

function handleInvalidNativeMobileToken(
  status: number,
  body: any,
  url: string,
  failedToken: string | null,
): void {
  if (status !== 401 || !isNativeCapacitorPlatform()) {
    return;
  }

  const session = getMobileAuthSession();
  if (!session?.token || !hasInvalidNativeMobileToken(body)) {
    return;
  }

  const failedTokenFingerprint = getMobileAuthTokenFingerprint(failedToken);
  const currentTokenFingerprint = getMobileAuthTokenFingerprint(session.token);

  apiLog('[API] native token invalidation check', {
    at: Date.now(),
    url,
    failedTokenFingerprint,
    currentTokenFingerprint,
    causeCode: typeof body?.details?.cause?.code === 'string' ? body.details.cause.code : null,
  });

  if (failedTokenFingerprint && currentTokenFingerprint && failedTokenFingerprint !== currentTokenFingerprint) {
    apiLog('[API] skip clearing mobile session for stale failed token', {
      at: Date.now(),
      url,
      failedTokenFingerprint,
      currentTokenFingerprint,
    });
    return;
  }

  apiLog('[API] clearing mobile session for failed token', {
    at: Date.now(),
    url,
    failedTokenFingerprint,
    currentTokenFingerprint,
  });
  clearMobileAuthSession('expired-or-invalid-callback-token', {
    url,
    failedTokenFingerprint,
    currentTokenFingerprint,
    code: typeof body?.code === 'string' ? body.code : null,
    causeCode: typeof body?.details?.cause?.code === 'string' ? body.details.cause.code : null,
    causeName: typeof body?.details?.cause?.name === 'string' ? body.details.cause.name : null,
  });
  setApiAuthTokenProvider(null);
}

async function tryRefreshNativeMobileToken(url: string, body: any, failedToken: string | null): Promise<boolean> {
  if (!isNativeCapacitorPlatform() || !hasInvalidNativeMobileToken(body)) {
    return false;
  }

  const session = getMobileAuthSession();
  if (!session?.token) {
    return false;
  }

  apiLog('[API] attempting native token refresh', {
    at: Date.now(),
    url,
    failedTokenFingerprint: getMobileAuthTokenFingerprint(failedToken),
    causeCode: typeof body?.details?.cause?.code === 'string' ? body.details.cause.code : null,
  });

  const refreshed = await ensureFreshMobileAuthSession({
    force: true,
    reason: 'api-401',
    minValidityMs: 0,
  });

  const didRefresh = Boolean(refreshed?.token && refreshed.token !== session.token);

  if (didRefresh) {
    apiLog('[API] native token refresh succeeded', {
      at: Date.now(),
      url,
      previousTokenFingerprint: getMobileAuthTokenFingerprint(session.token),
      refreshedTokenFingerprint: getMobileAuthTokenFingerprint(refreshed?.token ?? null),
    });
  }

  return didRefresh;
}

const DEV_USER_HEADER = 'X-Innerbloom-Demo-User';
const DEV_USER_SWITCH_ENABLED =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_ENABLE_DEV_USER_SWITCH ?? 'false').toLowerCase() === 'true';

export const DEV_USER_SWITCH_OPTIONS = [
  { id: 'user_demo_active', label: 'Active' },
  { id: 'user_demo_claim', label: 'Claim' },
  { id: 'user_demo_cooldown', label: 'Cooldown' },
  { id: 'user_demo_idle', label: 'Idle' },
] as const;

type DevUserOption = (typeof DEV_USER_SWITCH_OPTIONS)[number]['id'];

let devUserOverride: DevUserOption | null = DEV_USER_SWITCH_ENABLED
  ? DEV_USER_SWITCH_OPTIONS[0]?.id ?? null
  : null;

type DevUserListener = (userId: string | null) => void;
const devUserListeners = new Set<DevUserListener>();
let devBoardCache: Record<string, MissionsV2BoardResponse> | null = null;

function notifyDevUserListeners(userId: string | null) {
  for (const listener of devUserListeners) {
    try {
      listener(userId);
    } catch (error) {
      logApiError('Dev user listener failed', { error });
    }
  }
}

function applyDevUserOverride(init?: RequestInit): RequestInit {
  if (!DEV_USER_SWITCH_ENABLED || !devUserOverride) {
    return init ?? {};
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set(DEV_USER_HEADER, devUserOverride);

  return {
    ...(init ?? {}),
    headers,
  };
}

export function getDevUserOverride(): string | null {
  return DEV_USER_SWITCH_ENABLED ? devUserOverride : null;
}

export function setDevUserOverride(nextUser: DevUserOption | null): void {
  if (!DEV_USER_SWITCH_ENABLED) {
    devUserOverride = null;
    notifyDevUserListeners(null);
    return;
  }

  const normalized = nextUser ?? null;
  if (devUserOverride === normalized) {
    return;
  }

  devUserOverride = normalized;
  notifyDevUserListeners(devUserOverride);
}

export function onDevUserOverrideChange(listener: DevUserListener): () => void {
  devUserListeners.add(listener);
  return () => {
    devUserListeners.delete(listener);
  };
}

export const DEV_USER_SWITCH_ACTIVE = DEV_USER_SWITCH_ENABLED;

async function loadDevBoard(userId: string | null): Promise<MissionsV2BoardResponse | null> {
  if (!DEV_USER_SWITCH_ENABLED) {
    return null;
  }

  if (!userId) {
    return null;
  }

  if (devBoardCache) {
    return devBoardCache[userId] ?? null;
  }

  try {
    const response = await fetch('/demo/missions_v2_boards.json', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as Record<string, MissionsV2BoardResponse>;
    devBoardCache = data;
    return data[userId] ?? null;
  } catch (error) {
    logApiError('Failed to load missions demo boards', { error });
    return null;
  }
}

export async function apiRequest<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  try {
    const requestInit = applyDevUserOverride(init);

    const execute = async (): Promise<{ response: Response; authToken: string | null }> => {
      try {
        const authToken = await resolveAuthToken();
        apiLog('[API] request started', {
          at: Date.now(),
          url,
          tokenFingerprint: getMobileAuthTokenFingerprint(authToken),
        });
        const response = await fetch(url, applyAuthorization(requestInit, authToken));
        return { response, authToken };
      } catch (error) {
        if (error instanceof Error) {
          apiLog('[API] auth token resolution failed', {
            url,
            error: error.message,
          });
        }
        throw error;
      }
    };

    let { response: res, authToken: requestAuthToken } = await execute();

    logApiDebug('API response received', { url, status: res.status });

    if (!res.ok) {
      let body = await safeJson(res);
      const requestId =
        res.headers.get('x-railway-request-id') || res.headers.get('x-request-id') || undefined;

      apiLog('[API] request failed before refresh handling', {
        at: Date.now(),
        url,
        status: res.status,
        tokenFingerprint: getMobileAuthTokenFingerprint(requestAuthToken),
        causeCode: typeof body?.details?.cause?.code === 'string' ? body.details.cause.code : null,
      });

      if (await tryRefreshNativeMobileToken(url, body, requestAuthToken)) {
        ({ response: res, authToken: requestAuthToken } = await execute());
        logApiDebug('API response received after native token refresh', { url, status: res.status });
        if (res.ok) {
          const json = (await res.json()) as T;
          logApiDebug('API response parsed after native token refresh', { url, data: json });
          return json;
        }

        body = await safeJson(res);
      }

      handleInvalidNativeMobileToken(res.status, body, url, requestAuthToken);

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

const BUILD_TARGET = String(import.meta.env.VITE_BUILD_TARGET ?? '').trim().toLowerCase();
const PREFER_NATIVE_LOCAL_API =
  BUILD_TARGET === 'native' || BUILD_TARGET === 'native-local' || BUILD_TARGET === 'capacitor';
const RAW_API_BASE_URL = String(
  (PREFER_NATIVE_LOCAL_API
    ? import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL) ?? '',
).trim();

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
console.info('[API] build target =', BUILD_TARGET || 'web');

if (API_BASE) {
  logApiDebug('API base URL configured', {
    raw: RAW_API_BASE_URL,
    normalized: API_BASE,
    buildTarget: BUILD_TARGET || 'web',
    preferNativeLocalApi: PREFER_NATIVE_LOCAL_API,
  });
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

export type ModerationTrackerType = 'alcohol' | 'tobacco' | 'sugar';

export type ModerationTrackerConfig = {
  type: ModerationTrackerType;
  isEnabled: boolean;
  isPaused: boolean;
  notLoggedToleranceDays: number;
};

type ModerationTrackerConfigPatch = Partial<
  Pick<ModerationTrackerConfig, 'isEnabled' | 'isPaused' | 'notLoggedToleranceDays'>
>;

function normalizeModerationTrackerConfig(
  type: ModerationTrackerType,
  payload: unknown,
): ModerationTrackerConfig {
  const source = (payload ?? {}) as Record<string, unknown>;
  return {
    type,
    isEnabled: source.isEnabled === true,
    isPaused: source.isPaused === true,
    notLoggedToleranceDays: Math.max(0, Number(source.notLoggedToleranceDays ?? 2) || 2),
  };
}

export async function getModerationTrackerConfig(type: ModerationTrackerType): Promise<ModerationTrackerConfig> {
  const payload = await apiAuthorizedGet<unknown>(`/moderation/${type}/config`);
  return normalizeModerationTrackerConfig(type, payload);
}

export async function updateModerationTrackerConfig(
  type: ModerationTrackerType,
  patch: ModerationTrackerConfigPatch,
): Promise<ModerationTrackerConfig> {
  const response = await apiAuthorizedFetch(`/moderation/${type}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, `/api/moderation/${type}/config`);
  }

  const payload = (await safeJson(response)) ?? patch;
  return normalizeModerationTrackerConfig(type, payload);
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

export type HabitAchievementShelfItem = {
  id: string;
  taskId: string;
  taskName: string;
  pillar: string | null;
  trait: { id: string | null; code: string | null; name: string | null } | null;
  seal: { visible: boolean };
  status: 'maintained' | 'stored' | 'pending_decision';
  achievedAt: string | null;
  decisionMadeAt: string | null;
  gpBeforeAchievement: number;
  gpSinceMaintain: number;
  maintainEnabled: boolean;
};

export type HabitAchievementPillarGroup = {
  pillar: { id: string | null; code: string; name: string };
  habits: HabitAchievementShelfItem[];
};

export type RewardsHistorySummary = {
  weeklyWrapups: WeeklyWrappedRecord[];
  weeklyUnseenCount: number;
  monthlyWrapups: WeeklyWrappedRecord[];
  habitAchievements: {
    pendingCount: number;
    achievedByPillar: HabitAchievementPillarGroup[];
  };
};

export type TaskHabitAchievementState = {
  task: {
    id: string;
    name: string | null;
    lifecycleStatus: string | null;
  };
  achievement: {
    exists: boolean;
    status: 'not_achieved' | 'pending_decision' | 'maintained' | 'stored' | 'expired_pending';
    achievedAt: string | null;
    decisionMadeAt: string | null;
    gpBeforeAchievement: number;
    gpSinceMaintain: number;
    maintainEnabled: boolean;
    sealVisible: boolean;
  };
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

export async function getWeeklyWrappedLatest(userId: string): Promise<WeeklyWrappedRecord | null> {
  console.info('[weekly-wrapped] fetching latest record', { userId });
  const response = await getAuthorizedJson<{ item: WeeklyWrappedRecord | null }>(
    `/users/${encodeURIComponent(userId)}/weekly-wrapped/latest`,
  );
  logShape('[weekly-wrapped] latest response', response);
  console.info('[weekly-wrapped] latest record resolved', { hasItem: Boolean(response.item) });
  return response.item ?? null;
}

export async function getWeeklyWrappedPrevious(userId: string): Promise<WeeklyWrappedRecord | null> {
  console.info('[weekly-wrapped] fetching previous record', { userId });
  const response = await getAuthorizedJson<{ item: WeeklyWrappedRecord | null }>(
    `/users/${encodeURIComponent(userId)}/weekly-wrapped/previous`,
  );
  logShape('[weekly-wrapped] previous response', response);
  console.info('[weekly-wrapped] previous record resolved', { hasItem: Boolean(response.item) });
  return response.item ?? null;
}

export async function getWeeklyWrappedPending(userId: string): Promise<{ item: WeeklyWrappedRecord | null; unseenCount: number }> {
  const response = await getAuthorizedJson<{ item: WeeklyWrappedRecord | null; unseen_count?: number }>(
    `/users/${encodeURIComponent(userId)}/weekly-wrapped/pending`,
  );
  return {
    item: response.item ?? null,
    unseenCount: Number(response.unseen_count ?? 0) || 0,
  };
}

export async function markWeeklyWrappedSeen(userId: string, weeklyWrappedId: string): Promise<{ seenAt: string | null; unseenCount: number }> {
  const response = await postAuthorizedJson<{ seen_at?: string | null; unseen_count?: number }>(
    `/users/${encodeURIComponent(userId)}/weekly-wrapped/${encodeURIComponent(weeklyWrappedId)}/seen`,
    {},
  );
  return {
    seenAt: typeof response.seen_at === 'string' ? response.seen_at : null,
    unseenCount: Number(response.unseen_count ?? 0) || 0,
  };
}

type RawRewardsHistoryResponse = {
  weekly_wrapups?: WeeklyWrappedRecord[];
  weekly_unseen_count?: number;
  monthly_wrapups?: WeeklyWrappedRecord[];
  habit_achievements?: {
    pending_count?: number;
    achieved_by_pillar?: Array<{
      pillar?: { id?: string | number | null; code?: string | null; name?: string | null };
      habits?: Array<Record<string, unknown>>;
    }>;
  };
};

function normalizeHabitAchievementShelfItem(raw: Record<string, unknown>): HabitAchievementShelfItem {
  return {
    id: pickString(raw.id) ?? `habit-${Math.random().toString(36).slice(2, 8)}`,
    taskId: pickString(raw.task_id) ?? pickString(raw.taskId) ?? '',
    taskName: pickString(raw.task_name) ?? pickString(raw.taskName) ?? 'Habit',
    pillar: pickString(raw.pillar_code) ?? pickString((raw.pillar as Record<string, unknown> | undefined)?.code),
    trait: raw.trait && isRecord(raw.trait)
      ? {
          id: pickString((raw.trait as Record<string, unknown>).id),
          code: pickString((raw.trait as Record<string, unknown>).code),
          name: pickString((raw.trait as Record<string, unknown>).name),
        }
      : null,
    seal: { visible: Boolean((raw.seal as Record<string, unknown> | undefined)?.visible) },
    status: (pickString(raw.status) as HabitAchievementShelfItem['status']) ?? 'stored',
    achievedAt: pickString(raw.achieved_at) ?? pickString(raw.achievedAt),
    decisionMadeAt: pickString(raw.decision_made_at) ?? pickString(raw.decisionMadeAt),
    gpBeforeAchievement: Number(raw.gp_before_achievement ?? raw.gpBeforeAchievement ?? 0) || 0,
    gpSinceMaintain: Number(raw.gp_since_maintain ?? raw.gpSinceMaintain ?? 0) || 0,
    maintainEnabled: Boolean(raw.maintain_enabled ?? raw.maintainEnabled),
  };
}

export async function getRewardsHistory(userId: string): Promise<RewardsHistorySummary> {
  const response = await getAuthorizedJson<RawRewardsHistoryResponse>(`/users/${encodeURIComponent(userId)}/rewards/history`);
  const pillarGroups = Array.isArray(response.habit_achievements?.achieved_by_pillar)
    ? response.habit_achievements?.achieved_by_pillar ?? []
    : [];

  return {
    weeklyWrapups: Array.isArray(response.weekly_wrapups) ? response.weekly_wrapups : [],
    weeklyUnseenCount: Number(response.weekly_unseen_count ?? 0) || 0,
    monthlyWrapups: Array.isArray(response.monthly_wrapups) ? response.monthly_wrapups : [],
    habitAchievements: {
      pendingCount: Number(response.habit_achievements?.pending_count ?? 0) || 0,
      achievedByPillar: pillarGroups.map((group) => ({
        pillar: {
          id: pickString(group.pillar?.id),
          code: pickString(group.pillar?.code) ?? 'UNKNOWN',
          name: pickString(group.pillar?.name) ?? 'Unknown',
        },
        habits: Array.isArray(group.habits) ? group.habits.filter(isRecord).map(normalizeHabitAchievementShelfItem) : [],
      })),
    },
  };
}

export async function getTaskHabitAchievement(taskId: string): Promise<TaskHabitAchievementState> {
  const response = await getAuthorizedJson<Record<string, unknown>>(`/tasks/${encodeURIComponent(taskId)}/habit-achievement`);
  const task = (response.task as Record<string, unknown> | undefined) ?? {};
  const achievement = (response.achievement as Record<string, unknown> | undefined) ?? {};
  return {
    task: {
      id: pickString(task.id) ?? taskId,
      name: pickString(task.name),
      lifecycleStatus: pickString(task.lifecycle_status) ?? pickString(task.lifecycleStatus),
    },
    achievement: {
      exists: Boolean(achievement.exists),
      status: (pickString(achievement.status) as TaskHabitAchievementState['achievement']['status']) ?? 'not_achieved',
      achievedAt: pickString(achievement.achieved_at) ?? pickString(achievement.achievedAt),
      decisionMadeAt: pickString(achievement.decision_made_at) ?? pickString(achievement.decisionMadeAt),
      gpBeforeAchievement: Number(achievement.gp_before_achievement ?? achievement.gpBeforeAchievement ?? 0) || 0,
      gpSinceMaintain: Number(achievement.gp_since_maintain ?? achievement.gpSinceMaintain ?? 0) || 0,
      maintainEnabled: Boolean(achievement.maintain_enabled ?? achievement.maintainEnabled),
      sealVisible: Boolean((achievement.seal as Record<string, unknown> | undefined)?.visible ?? achievement.seal_visible),
    },
  };
}

export async function decideTaskHabitAchievement(taskId: string, decision: 'maintain' | 'store'): Promise<TaskHabitAchievementState> {
  const response = await apiAuthorizedFetch(`/tasks/${encodeURIComponent(taskId)}/habit-achievement/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ decision }),
  });
  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, `/api/tasks/${taskId}/habit-achievement/decision`);
  }
  return getTaskHabitAchievement(taskId);
}

export async function toggleTaskHabitAchievementMaintained(taskId: string, maintainEnabled: boolean): Promise<TaskHabitAchievementState> {
  const response = await apiAuthorizedFetch(`/tasks/${encodeURIComponent(taskId)}/habit-achievement/toggle-maintained`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ maintainEnabled }),
  });
  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, `/api/tasks/${taskId}/habit-achievement/toggle-maintained`);
  }
  return getTaskHabitAchievement(taskId);
}

export type StreakSummary = {
  userId: string;
  current: number;
  longest: number;
  updatedAt?: string;
};

export type WeeklyWrappedRecord = {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  payload: WeeklyWrappedPayload;
  createdAt: string;
  updatedAt: string;
  seen?: boolean;
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
  limit?: number;
  offset?: number;
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
  const id =
    pickString(raw.id) ??
    pickString((raw as Record<string, unknown> | undefined)?.task_id) ??
    pickString((raw as Record<string, unknown> | undefined)?.taskId);

  if (!id) {
    throw new Error('User task payload is missing an id.');
  }

  const title =
    pickString(raw.title) ??
    pickString((raw as Record<string, unknown> | undefined)?.task) ??
    pickString((raw as Record<string, unknown> | undefined)?.name) ??
    pickString((raw as Record<string, unknown> | undefined)?.label) ??
    `Tarea ${id}`;

  const pillarId =
    pickString(raw.pillarId) ??
    pickString((raw as Record<string, unknown> | undefined)?.pillar_id) ??
    pickString((raw as Record<string, unknown> | undefined)?.pillar) ??
    null;

  const traitId =
    pickString(raw.traitId) ??
    pickString((raw as Record<string, unknown> | undefined)?.trait_id) ??
    pickString((raw as Record<string, unknown> | undefined)?.trait) ??
    null;

  const statId =
    pickString(raw.statId) ??
    pickString((raw as Record<string, unknown> | undefined)?.stat_id) ??
    pickString((raw as Record<string, unknown> | undefined)?.stat) ??
    null;

  const difficultyId =
    pickString(raw.difficultyId) ??
    pickString((raw as Record<string, unknown> | undefined)?.difficulty_id) ??
    pickString((raw as Record<string, unknown> | undefined)?.difficulty) ??
    null;

  const createdAt =
    pickString(raw.createdAt) ??
    pickString((raw as Record<string, unknown> | undefined)?.created_at) ??
    pickString((raw as Record<string, unknown> | undefined)?.inserted_at) ??
    null;

  const updatedAt =
    pickString(raw.updatedAt) ??
    pickString((raw as Record<string, unknown> | undefined)?.updated_at) ??
    null;

  const completedAt =
    pickString(raw.completedAt) ??
    pickString((raw as Record<string, unknown> | undefined)?.completed_at) ??
    pickString((raw as Record<string, unknown> | undefined)?.last_completed_at) ??
    pickString((raw as Record<string, unknown> | undefined)?.done_at) ??
    null;

  const archivedAt =
    pickString(raw.archivedAt) ??
    pickString((raw as Record<string, unknown> | undefined)?.archived_at) ??
    pickString((raw as Record<string, unknown> | undefined)?.deleted_at) ??
    pickString((raw as Record<string, unknown> | undefined)?.deactivated_at) ??
    null;

  const xp =
    pickNumber(raw.xp) ??
    pickNumber((raw as Record<string, unknown> | undefined)?.xp_base) ??
    pickNumber((raw as Record<string, unknown> | undefined)?.base_xp) ??
    pickNumber((raw as Record<string, unknown> | undefined)?.xpValue) ??
    null;

  const isActive = pickBoolean(
    raw.isActive ??
      (raw as Record<string, unknown> | undefined)?.is_active ??
      (raw as Record<string, unknown> | undefined)?.active ??
      (raw as Record<string, unknown> | undefined)?.enabled,
    true,
  );

  return {
    id,
    title,
    pillarId,
    traitId,
    statId,
    difficultyId,
    isActive,
    xp,
    createdAt,
    updatedAt,
    completedAt,
    archivedAt,
  } satisfies UserTask;
}

function normalizeUserTaskList(source: unknown): UserTask[] {
  if (!source) {
    return [];
  }

  const items: RawUserTask[] = Array.isArray(source)
    ? (source.filter(isRecord) as RawUserTask[])
    : extractArray<RawUserTask>(source, 'tasks', 'items', 'data').filter(isRecord);

  return items.map(normalizeUserTask);
}

function normalizeUserTaskSingle(source: unknown): UserTask | null {
  if (!source) {
    return null;
  }

  if (Array.isArray(source) && source.length > 0) {
    const [first] = source;
    if (isRecord(first)) {
      return normalizeUserTask(first as RawUserTask);
    }
    return null;
  }

  if (!isRecord(source)) {
    return null;
  }

  if (source.task && isRecord(source.task)) {
    return normalizeUserTask(source.task as RawUserTask);
  }

  if (source.data && isRecord(source.data)) {
    return normalizeUserTask(source.data as RawUserTask);
  }

  if (source.item && isRecord(source.item)) {
    return normalizeUserTask(source.item as RawUserTask);
  }

  if ('id' in source || 'task_id' in source || 'taskId' in source) {
    return normalizeUserTask(source as RawUserTask);
  }

  return null;
}

const DEMO_TODAY = '2026-03-01';
let demoModerationState: ModerationStateResponse = {
  dayKey: DEMO_TODAY,
  dailyQuestCompleted: false,
  trackers: [
    { type: 'alcohol', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0, statusToday: 'not_logged' },
    { type: 'tobacco', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 4, statusToday: 'on_track' },
    { type: 'sugar', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 2, statusToday: 'off_track' },
  ],
};

const DEMO_USER_TASKS: UserTask[] = [
  { id: 'task-minoxidil', title: 'Minoxidil noche', pillarId: 'Body', traitId: null, statId: 'Recuperación', difficultyId: '2', isActive: true, xp: 40, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-correr', title: '10.000 pasos / Correr', pillarId: 'Body', traitId: null, statId: 'Movilidad', difficultyId: '2', isActive: true, xp: 55, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-no-dulces', title: 'No dulces', pillarId: 'Body', traitId: null, statId: 'Nutrición', difficultyId: '2', isActive: true, xp: 45, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-gym', title: 'gym', pillarId: 'Body', traitId: null, statId: 'Energía', difficultyId: '2', isActive: true, xp: 50, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-pantallas', title: '20` Sin pantallas antes de dormir', pillarId: 'Mind', traitId: null, statId: 'Recuperación', difficultyId: '2', isActive: true, xp: 35, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-ayuno', title: 'Ayuno hasta las 14hs', pillarId: 'Body', traitId: null, statId: 'Nutrición', difficultyId: '2', isActive: true, xp: 45, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
  { id: 'task-cena', title: 'Cena antes de las 22hs', pillarId: 'Body', traitId: null, statId: 'Nutrición', difficultyId: '2', isActive: true, xp: 45, createdAt: null, updatedAt: null, completedAt: null, archivedAt: null },
];

function cloneDemo<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function getUserTasks(userId: string): Promise<UserTask[]> {
  if (isDashboardDemoModeEnabled()) {
    return cloneDemo(DEMO_USER_TASKS);
  }

  const response = await getAuthorizedJson<UserTasksResponse | RawUserTask[] | null>(
    `/users/${encodeURIComponent(userId)}/tasks`,
  );
  logShape('user-tasks', response);
  return normalizeUserTaskList(response);
}

export type CreateUserTaskInput = {
  title: string;
  pillarId?: string | null;
  traitId?: string | null;
  statId?: string | null;
  difficultyId?: string | null;
  isActive?: boolean;
};

export type UpdateUserTaskInput = {
  title?: string;
  pillarId?: string | null;
  traitId?: string | null;
  statId?: string | null;
  difficultyId?: string | null;
  isActive?: boolean;
};

function buildUserTaskPayload(
  payload: CreateUserTaskInput | UpdateUserTaskInput,
  options: { requireTitle?: boolean } = {},
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if ('title' in payload) {
    const title = pickString(payload.title);
    if (options.requireTitle && !title) {
      throw new Error('Task title is required.');
    }
    if (title != null) {
      body.title = title;
    }
  } else if (options.requireTitle) {
    throw new Error('Task title is required.');
  }

  if ('pillarId' in payload) {
    body.pillar_id = payload.pillarId ?? null;
  }

  if ('traitId' in payload) {
    body.trait_id = payload.traitId ?? null;
  }

  if ('statId' in payload) {
    body.stat_id = payload.statId ?? null;
  }

  if ('difficultyId' in payload) {
    body.difficulty_id = payload.difficultyId ?? null;
  }

  if ('isActive' in payload) {
    body.is_active = Boolean(payload.isActive);
  }

  return body;
}

async function submitUserTaskRequest(
  userId: string,
  taskId: string | null,
  method: 'POST' | 'PATCH' | 'DELETE',
  payload?: Record<string, unknown>,
): Promise<Response> {
  const basePath = `/users/${encodeURIComponent(userId)}/tasks`;
  const url = buildApiUrl(taskId ? `${basePath}/${encodeURIComponent(taskId)}` : basePath);

  const init: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
    },
  };

  if (payload) {
    init.headers = {
      ...init.headers,
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(payload);
  }

  const response = await apiAuthorizedFetch(url, init);

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(response.status, body, url);
  }

  return response;
}

export async function createUserTask(userId: string, payload: CreateUserTaskInput): Promise<UserTask> {
  const body = buildUserTaskPayload(payload, { requireTitle: true });
  const response = await submitUserTaskRequest(userId, null, 'POST', body);
  const json = await response.json().catch(() => null);
  logShape('user-task-create', json);

  const normalized = normalizeUserTaskSingle(json);
  if (!normalized) {
    throw new Error('API response did not include the created task.');
  }

  return normalized;
}

export async function updateUserTask(
  userId: string,
  taskId: string,
  payload: UpdateUserTaskInput,
): Promise<UserTask> {
  const body = buildUserTaskPayload(payload);
  const response = await submitUserTaskRequest(userId, taskId, 'PATCH', body);
  const json = await response.json().catch(() => null);
  logShape('user-task-update', json);

  const normalized = normalizeUserTaskSingle(json);
  if (!normalized) {
    throw new Error('API response did not include the updated task.');
  }

  return normalized;
}

export async function deleteUserTask(userId: string, taskId: string): Promise<void> {
  await submitUserTaskRequest(userId, taskId, 'DELETE');
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
  if (isDashboardDemoModeEnabled()) {
    return [
      { date: '2025-10-03', mood: 'Calma' }, { date: '2025-10-08', mood: 'Motivación' },
      { date: '2025-10-14', mood: 'Felicidad' }, { date: '2025-10-20', mood: 'Tristeza' },
      { date: '2025-10-24', mood: 'Motivación' }, { date: '2025-11-02', mood: 'Calma' },
      { date: '2025-11-11', mood: 'Frustración' }, { date: '2025-11-20', mood: 'Ansiedad' },
      { date: '2025-12-02', mood: 'Cansancio' }, { date: '2025-12-10', mood: 'Felicidad' },
      { date: '2025-12-19', mood: 'Motivación' }, { date: '2026-01-03', mood: 'Calma' },
      { date: '2026-01-09', mood: 'Cansancio' }, { date: '2026-01-17', mood: 'Motivación' },
      { date: '2026-01-25', mood: 'Felicidad' }, { date: '2026-02-05', mood: 'Calma' },
      { date: '2026-02-14', mood: 'Motivación' }, { date: '2026-02-23', mood: 'Ansiedad' },
      { date: '2026-03-01', mood: 'Motivación' },
    ];
  }
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
  if (isDashboardDemoModeEnabled()) {
    return {
      date: DEMO_TODAY,
      mode: 'flow',
      mode_name: 'flow',
      weekly_target: 3,
      grace: { applied: false, unique_days: 0 },
      pillars: {
        Body: { hp: 86, xp_today: 78, xp_obj_day: 100 },
        Mind: { focus: 42, xp_today: 64, xp_obj_day: 100 },
        Soul: { mood: 55, xp_today: 71, xp_obj_day: 100 },
      },
    };
  }
  const response = await getAuthorizedJson<UserState>(`/users/${encodeURIComponent(userId)}/state`);
  logShape('user-state', response);
  return response;
}

export type EnergyTrendPillar = {
  current: number;
  previous: number | null;
  deltaPct: number | null;
};

export type EnergyTrend = {
  currentDate: string;
  previousDate: string;
  hasHistory: boolean;
  pillars: {
    Body: EnergyTrendPillar;
    Mind: EnergyTrendPillar;
    Soul: EnergyTrendPillar;
  };
} | null;

export type DailyEnergySnapshot = {
  user_id: string;
  hp_pct: number;
  mood_pct: number;
  focus_pct: number;
  hp_norm: number;
  mood_norm: number;
  focus_norm: number;
  trend: EnergyTrend;
};

export async function getUserDailyEnergy(userId: string): Promise<DailyEnergySnapshot | null> {
  if (isDashboardDemoModeEnabled()) {
    return {
      user_id: userId,
      hp_pct: 86, mood_pct: 55, focus_pct: 42,
      hp_norm: 0.86, mood_norm: 0.55, focus_norm: 0.42,
      trend: {
        currentDate: DEMO_TODAY, previousDate: '2026-02-29', hasHistory: true,
        pillars: {
          Body: { current: 86, previous: 72, deltaPct: 18.8 },
          Mind: { current: 42, previous: 39, deltaPct: 6.4 },
          Soul: { current: 55, previous: 48, deltaPct: 15.5 },
        },
      },
    };
  }
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
  if (isDashboardDemoModeEnabled()) {
    const series = [
      { date: '2026-03-01', xp_day: 29 },{ date: '2026-03-02', xp_day: 31 },{ date: '2026-03-03', xp_day: 24 },
      { date: '2026-03-04', xp_day: 26 },{ date: '2026-03-05', xp_day: 35 },{ date: '2026-03-06', xp_day: 28 },
      { date: '2026-03-07', xp_day: 21 },{ date: '2026-03-08', xp_day: 23 },{ date: '2026-03-09', xp_day: 26 },
      { date: '2026-03-10', xp_day: 24 },{ date: '2026-03-11', xp_day: 17 },
    ];
    return { from: params.from ?? series[0].date, to: params.to ?? series[series.length - 1].date, series };
  }
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
  pillar?: string;
  sortOrder?: number;
};

export type UserXpByTraitResponse = {
  traits: TraitXpEntry[];
};

export async function getUserXpByTrait(
  userId: string,
  params: { from?: string; to?: string } = {},
): Promise<UserXpByTraitResponse> {
  if (isDashboardDemoModeEnabled()) {
    return { traits: [
      { trait: 'sleep', name: 'Recuperación', xp: 517, pillar: 'Body', sortOrder: 1 },
      { trait: 'movement', name: 'Movilidad', xp: 437, pillar: 'Body', sortOrder: 2 },
      { trait: 'nutrition', name: 'Nutrición', xp: 375, pillar: 'Body', sortOrder: 3 },
      { trait: 'focus', name: 'Concentración', xp: 312, pillar: 'Mind', sortOrder: 4 },
      { trait: 'learning', name: 'Aprendizaje', xp: 397, pillar: 'Mind', sortOrder: 5 },
      { trait: 'meditation', name: 'Respiración', xp: 430, pillar: 'Soul', sortOrder: 6 },
      { trait: 'purpose', name: 'Propósito', xp: 223, pillar: 'Soul', sortOrder: 7 },
      { trait: 'connection', name: 'Vínculos', xp: 245, pillar: 'Soul', sortOrder: 8 },
      { trait: 'reflection', name: 'Reflexión', xp: 246, pillar: 'Mind', sortOrder: 9 },
      { trait: 'play', name: 'Juego', xp: 208, pillar: 'Soul', sortOrder: 10 },
      { trait: 'planning', name: 'Planificación', xp: 147, pillar: 'Mind', sortOrder: 11 },
      { trait: 'discipline', name: 'Disciplina', xp: 428, pillar: 'Body', sortOrder: 12 },
    ] };
  }
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
    const pillarValue =
      item?.pillar ??
      item?.pillar_code ??
      item?.pillar_name ??
      item?.pillarId ??
      item?.pillar_id ??
      '';
    const sortOrderValue =
      item?.sort_order ??
      item?.sortOrder ??
      item?.order ??
      item?.order_index ??
      item?.orderIndex ??
      null;

    const trait = String(traitValue ?? '').trim();
    const name = String(nameValue ?? '').trim();
    const xp = Number(xpValue ?? 0);
    const pillar = String(pillarValue ?? '').trim();
    const sortOrder = Number(sortOrderValue ?? Number.NaN);

    return {
      trait,
      name: name.length > 0 ? name : undefined,
      xp: Number.isFinite(xp) ? xp : 0,
      pillar: pillar.length > 0 ? pillar : undefined,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : undefined,
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
    qtr: { count: number; xp: number; weeks: number[]; weekTotals?: number[] };
  };
};

export type StreakPanelResponse = {
  topStreaks: StreakPanelTopEntry[];
  tasks: StreakPanelTask[];
};

export type TaskInsightsResponse = {
  task: { id: string; name: string; stat: string | null; description: string | null };
  month: { totalCount: number; totalXp?: number; days: Array<{ date: string; count: number }> };
  weeks: {
    weeklyGoal: number;
    completionRate: number;
    weeksSample?: number | string | null;
    currentStreak: number;
    bestStreak: number;
    timeline: Array<{ weekStart: string; weekEnd: string; count: number; hit: boolean }>;
  };
  recalibration?: {
    latest?: {
      action?: string | null;
      periodLabel?: string | null;
      periodStart?: string | null;
      periodEnd?: string | null;
      expectedTarget?: number | null;
      completions?: number | null;
      completionRate?: number | null;
      recalibratedAt?: string | null;
    } | null;
    history?: Array<{
      action?: string | null;
      periodLabel?: string | null;
      periodStart?: string | null;
      periodEnd?: string | null;
      expectedTarget?: number | null;
      completions?: number | null;
      completionRate?: number | null;
      recalibratedAt?: string | null;
    }>;
    eligible?: boolean | null;
  } | null;
};

export async function getUserStreakPanel(
  userId: string,
  params: { pillar: StreakPanelPillar; range: StreakPanelRange; mode?: string; query?: string },
): Promise<StreakPanelResponse> {
  if (isDashboardDemoModeEnabled()) {
    const tasks: StreakPanelTask[] = [
      { id: 'task-minoxidil', name: 'Minoxidil noche', stat: 'Recuperación', weekDone: 3, streakDays: 20, metrics: { week: { count: 3, xp: 120 }, month: { count: 24, xp: 960, weeks: [5, 6, 6, 7] }, qtr: { count: 61, xp: 2440, weeks: [5, 6, 6, 7, 5, 4], weekTotals: [5, 6, 6, 7, 5, 4] } } },
      { id: 'task-correr', name: '10.000 pasos / Correr', stat: 'Movilidad', weekDone: 2, streakDays: 4, metrics: { week: { count: 2, xp: 110 }, month: { count: 11, xp: 560, weeks: [2, 4, 3, 2] }, qtr: { count: 31, xp: 1540, weeks: [2, 4, 3, 2, 5, 3], weekTotals: [2, 4, 3, 2, 5, 3] } } },
      { id: 'task-no-dulces', name: 'No dulces', stat: 'Nutrición', weekDone: 0, streakDays: 0, metrics: { week: { count: 0, xp: 0 }, month: { count: 3, xp: 130, weeks: [0, 1, 1, 1] }, qtr: { count: 9, xp: 390, weeks: [0, 1, 1, 1, 2, 4], weekTotals: [0, 1, 1, 1, 2, 4] } } },
      { id: 'task-gym', name: 'gym', stat: 'Energía', weekDone: 0, streakDays: 0, metrics: { week: { count: 0, xp: 0 }, month: { count: 5, xp: 250, weeks: [1, 2, 1, 1] }, qtr: { count: 14, xp: 700, weeks: [1, 2, 1, 1, 4, 5], weekTotals: [1, 2, 1, 1, 4, 5] } } },
      { id: 'task-pantallas', name: '20` Sin pantallas antes de dormir', stat: 'Recuperación', weekDone: 0, streakDays: 0, metrics: { week: { count: 0, xp: 0 }, month: { count: 6, xp: 210, weeks: [1, 1, 2, 2] }, qtr: { count: 12, xp: 420, weeks: [1, 1, 2, 2, 3, 3], weekTotals: [1, 1, 2, 2, 3, 3] } } },
      { id: 'task-ayuno', name: 'Ayuno hasta las 14hs', stat: 'Nutrición', weekDone: 2, streakDays: 2, metrics: { week: { count: 2, xp: 90 }, month: { count: 9, xp: 405, weeks: [2, 2, 3, 2] }, qtr: { count: 26, xp: 1170, weeks: [2, 2, 3, 2, 7, 10], weekTotals: [2, 2, 3, 2, 7, 10] } } },
      { id: 'task-cena', name: 'Cena antes de las 22hs', stat: 'Nutrición', weekDone: 2, streakDays: 2, metrics: { week: { count: 2, xp: 90 }, month: { count: 8, xp: 360, weeks: [2, 2, 2, 2] }, qtr: { count: 22, xp: 990, weeks: [2, 2, 2, 2, 7, 7], weekTotals: [2, 2, 2, 2, 7, 7] } } },
    ];
    const topStreaks = tasks
      .filter((entry) => (params.pillar === 'Body' ? true : params.pillar === 'Mind' ? entry.id === 'task-pantallas' : entry.id === 'task-minoxidil'))
      .sort((a, b) => b.streakDays - a.streakDays)
      .slice(0, 3)
      .map((entry) => ({ id: entry.id, name: entry.name, stat: entry.stat, weekDone: entry.weekDone, streakDays: entry.streakDays }));
    return { topStreaks, tasks };
  }
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

export async function getTaskInsights(
  taskId: string,
  params?: { mode?: string | null; weeklyGoal?: number | null; range?: StreakPanelRange },
): Promise<TaskInsightsResponse> {
  if (isDashboardDemoModeEnabled()) {
    const task = DEMO_USER_TASKS.find((entry) => entry.id === taskId);
    return {
      task: { id: taskId, name: task?.title ?? 'Task demo', stat: task?.statId ?? null, description: 'Detalle de hábito en modo demo.' },
      month: { totalCount: 9, totalXp: 405, days: [
        { date: '2026-02-03', count: 1 }, { date: '2026-02-05', count: 1 }, { date: '2026-02-08', count: 2 },
        { date: '2026-02-13', count: 1 }, { date: '2026-02-16', count: 1 }, { date: '2026-02-20', count: 1 },
        { date: '2026-02-24', count: 1 }, { date: '2026-02-28', count: 1 },
      ] },
      weeks: {
        weeklyGoal: params?.weeklyGoal ?? 3, completionRate: 0.67, weeksSample: 6, currentStreak: 2, bestStreak: 20,
        timeline: [
          { weekStart: '2026-01-19', weekEnd: '2026-01-25', count: 2, hit: false },
          { weekStart: '2026-01-26', weekEnd: '2026-02-01', count: 3, hit: true },
          { weekStart: '2026-02-02', weekEnd: '2026-02-08', count: 2, hit: false },
          { weekStart: '2026-02-09', weekEnd: '2026-02-15', count: 3, hit: true },
          { weekStart: '2026-02-16', weekEnd: '2026-02-22', count: 1, hit: false },
          { weekStart: '2026-02-23', weekEnd: '2026-03-01', count: 3, hit: true },
        ],
      },
      recalibration: { eligible: true },
    };
  }
  const normalized: Record<string, string | undefined> = {
    mode: params?.mode ?? undefined,
    weeklyGoal:
      params?.weeklyGoal != null && Number.isFinite(params.weeklyGoal) && params.weeklyGoal > 0
        ? String(params.weeklyGoal)
        : undefined,
    range: params?.range,
  };

  const response = await getAuthorizedJson<TaskInsightsResponse>(
    `/tasks/${encodeURIComponent(taskId)}/insights`,
    normalized,
  );

  logShape('task-insights', response);
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


export type CurrentUserSubscriptionResponse = {
  plan: string;
  status: string;
  subscription_status?: 'free_trial' | 'active' | 'paused' | string;
  subscription_end_date?: string | null;
  trialEndsAt: string | null;
  nextRenewalAt: string | null;
};

export async function getCurrentUserSubscription(): Promise<CurrentUserSubscriptionResponse> {
  if (isDashboardDemoModeEnabled()) {
    return { plan: 'free', status: 'active', subscription_status: 'active', trialEndsAt: null, nextRenewalAt: null };
  }
  const response = await getAuthorizedJson<CurrentUserSubscriptionResponse>('/users/me/subscription');
  logShape('current-user-subscription', response);
  return response;
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
  if (isDashboardDemoModeEnabled()) {
    return { user_id: userId, current_level: 18, xp_total: 4308, xp_required_current: 4020, xp_required_next: 4596, xp_to_next: 288, progress_percent: 8 };
  }
  const response = await getAuthorizedJson<UserLevelResponse>(`/users/${encodeURIComponent(userId)}/level`);
  logShape('user-level', response);
  return response;
}

export type UserTotalXpResponse = {
  total_xp: number;
};

export async function getUserTotalXp(userId: string): Promise<UserTotalXpResponse> {
  if (isDashboardDemoModeEnabled()) {
    return { total_xp: 4308 };
  }
  const response = await getAuthorizedJson<UserTotalXpResponse>(`/users/${encodeURIComponent(userId)}/xp/total`);
  logShape('user-total-xp', response);
  return response;
}


export type OnboardingProgressStep =
  | 'onboarding_started'
  | 'game_mode_selected'
  | 'moderation_selected'
  | 'tasks_generated'
  | 'first_task_edited'
  | 'returned_to_dashboard_after_first_edit'
  | 'moderation_modal_shown'
  | 'moderation_modal_resolved'
  | 'first_daily_quest_prompted'
  | 'first_daily_quest_completed'
  | 'daily_quest_scheduled'
  | 'onboarding_completed';

export type OnboardingProgress = {
  user_id: string;
  onboarding_session_id: string | null;
  version: number;
  state: 'in_progress' | 'completed';
  onboarding_started_at: string | null;
  game_mode_selected_at: string | null;
  moderation_selected_at: string | null;
  tasks_generated_at: string | null;
  first_task_edited_at: string | null;
  returned_to_dashboard_after_first_edit_at: string | null;
  moderation_modal_shown_at: string | null;
  moderation_modal_resolved_at: string | null;
  first_daily_quest_prompted_at: string | null;
  first_daily_quest_completed_at: string | null;
  daily_quest_scheduled_at: string | null;
  onboarding_completed_at: string | null;
  source: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function getOnboardingProgress(): Promise<{ ok: boolean; progress: OnboardingProgress }> {
  return getAuthorizedJson<{ ok: boolean; progress: OnboardingProgress }>('/onboarding/progress');
}

export async function markOnboardingProgress(
  step: OnboardingProgressStep,
  source?: Record<string, unknown>,
): Promise<{ ok: boolean; progress: OnboardingProgress }> {
  const response = await apiAuthorizedFetch('/onboarding/progress/mark', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ step, source }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/onboarding/progress/mark');
  }

  return (await response.json()) as { ok: boolean; progress: OnboardingProgress };
}

export async function reconcileOnboardingProgressClient(flags: Partial<Record<OnboardingProgressStep, boolean>>): Promise<{ ok: boolean; progress: OnboardingProgress }> {
  const response = await apiAuthorizedFetch('/onboarding/progress/reconcile-client', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ flags }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/onboarding/progress/reconcile-client');
  }

  return (await response.json()) as { ok: boolean; progress: OnboardingProgress };
}

export type UserJourneySummary = {
  first_date_log: string | null;
  days_of_journey: number;
  quantity_daily_logs: number;
  first_programmed: boolean;
  first_tasks_confirmed: boolean;
  completed_first_daily_quest: boolean;
};
export type JourneyGenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type JourneyGenerationStateResponse = {
  status: JourneyGenerationStatus;
  correlation_id: string | null;
  updated_at: string;
  completed_at: string | null;
  failure_reason: string | null;
};


export async function getJourneyGenerationStatus(): Promise<{ ok: boolean; state: JourneyGenerationStateResponse | null; journey_ready_modal_seen_at?: string | null }> {
  return getAuthorizedJson<{ ok: boolean; state: JourneyGenerationStateResponse | null; journey_ready_modal_seen_at?: string | null }>('/onboarding/generation-status');
}

export async function markJourneyReadyModalSeen(generationKey: string): Promise<{ ok: boolean; seen_at: string }> {
  const response = await apiAuthorizedFetch('/onboarding/journey-ready-modal/seen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ generation_key: generationKey }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/onboarding/journey-ready-modal/seen');
  }

  return (await response.json()) as { ok: boolean; seen_at: string };
}

export type GameModeUpgradeSuggestion = {
  current_mode: string | null;
  suggested_mode: string | null;
  period_key: string | null;
  eligible_for_upgrade: boolean;
  tasks_total_evaluated: number;
  tasks_meeting_goal: number;
  task_pass_rate: number;
  accepted_at: string | null;
  dismissed_at: string | null;
  cta_enabled: boolean;
  cta_active_until: string | null;
  debug_forced_cta: boolean;
};

type GameModeUpgradeSuggestionMutationResponse = {
  ok: boolean;
  suggestion: GameModeUpgradeSuggestion;
};

export async function getGameModeUpgradeSuggestion(): Promise<GameModeUpgradeSuggestion> {
  if (isDashboardDemoModeEnabled()) {
    return { current_mode: 'flow', suggested_mode: 'evolve', period_key: null, eligible_for_upgrade: false, tasks_total_evaluated: 0, tasks_meeting_goal: 0, task_pass_rate: 0, accepted_at: null, dismissed_at: null, cta_enabled: false, cta_active_until: null, debug_forced_cta: false };
  }
  return getAuthorizedJson<GameModeUpgradeSuggestion>('/game-mode/upgrade-suggestion');
}

export async function acceptGameModeUpgradeSuggestion(): Promise<GameModeUpgradeSuggestionMutationResponse> {
  const response = await apiAuthorizedFetch('/game-mode/upgrade-suggestion/accept', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/game-mode/upgrade-suggestion/accept');
  }

  return (await response.json()) as GameModeUpgradeSuggestionMutationResponse;
}

export async function dismissGameModeUpgradeSuggestion(): Promise<GameModeUpgradeSuggestionMutationResponse> {
  const response = await apiAuthorizedFetch('/game-mode/upgrade-suggestion/dismiss', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/game-mode/upgrade-suggestion/dismiss');
  }

  return (await response.json()) as GameModeUpgradeSuggestionMutationResponse;
}

type GameModeChangeResponse = {
  ok: boolean;
  user: {
    user_id: string;
    game_mode_id: number;
    image_url: string | null;
    avatar_url: string | null;
  };
};

export async function changeCurrentUserGameMode(mode: 'LOW' | 'CHILL' | 'FLOW' | 'EVOLVE'): Promise<GameModeChangeResponse> {
  const response = await apiAuthorizedFetch('/game-mode/change', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    const body = await safeJson(response);
    throw new ApiError(response.status, body, '/game-mode/change');
  }

  return (await response.json()) as GameModeChangeResponse;
}


export async function getUserJourney(userId: string): Promise<UserJourneySummary> {
  if (isDashboardDemoModeEnabled()) {
    return { first_date_log: '2025-10-01', days_of_journey: 150, quantity_daily_logs: 84, first_programmed: true, first_tasks_confirmed: true, completed_first_daily_quest: true };
  }
  const response = await getAuthorizedJson<UserJourneySummary>(`/users/${encodeURIComponent(userId)}/journey`);
  logShape('user-journey', response);
  return response;
}

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
  was_first_schedule_completion?: boolean;
  wasFirstScheduleCompletion?: boolean;
};

export type UpdateDailyReminderSettingsPayload = {
  status: 'active' | 'paused';
  local_time: string;
  timezone: string;
};

const DAILY_REMINDER_CHANNEL = 'email';

export async function getDailyReminderSettings(
  channel = DAILY_REMINDER_CHANNEL,
): Promise<DailyReminderSettingsResponse> {
  const response = await getAuthorizedJson<DailyReminderSettingsResponse>('/me/daily-reminder', { channel });
  logShape('daily-reminder-settings', response);
  return response;
}

export async function updateDailyReminderSettings(
  payload: UpdateDailyReminderSettingsPayload,
  channel = DAILY_REMINDER_CHANNEL,
): Promise<DailyReminderSettingsResponse> {
  const token = await resolveAuthToken();
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const init = applyAuthorization(
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    },
    token,
  );
  const url = buildUrl('/me/daily-reminder', { channel });
  const response = await apiRequest<DailyReminderSettingsResponse>(url, init);
  logShape('daily-reminder-settings-update', response);
  return response;
}

export type ModerationStatus = 'on_track' | 'off_track' | 'not_logged';

export type ModerationTracker = {
  type: ModerationTrackerType;
  is_enabled: boolean;
  is_paused: boolean;
  not_logged_tolerance_days: number;
  current_streak_days: number;
  statusToday: ModerationStatus;
};

export type ModerationStateResponse = {
  dayKey: string;
  dailyQuestCompleted: boolean;
  trackers: ModerationTracker[];
};

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
  achievement_seal_visible?: boolean;
  lifecycle_status?: string | null;
};

export type DailyQuestDefinitionResponse = DailyQuestStatusResponse & {
  emotionOptions: DailyQuestEmotionOption[];
  pillars: Array<{
    pillar_code: string;
    tasks: DailyQuestTaskDefinition[];
  }>;
};

const DEMO_DAILY_QUEST_STATUS: DailyQuestStatusResponse = {
  date: DEMO_TODAY,
  submitted: false,
  submitted_at: null,
};

const DEMO_DAILY_QUEST_DEFINITION: DailyQuestDefinitionResponse = {
  ...DEMO_DAILY_QUEST_STATUS,
  emotionOptions: [
    { emotion_id: 1, code: 'calm', name: 'Calma' },
    { emotion_id: 2, code: 'happy', name: 'Felicidad' },
    { emotion_id: 3, code: 'motivation', name: 'Motivación' },
    { emotion_id: 4, code: 'sad', name: 'Tristeza' },
    { emotion_id: 5, code: 'anxiety', name: 'Ansiedad' },
    { emotion_id: 6, code: 'frustration', name: 'Frustración' },
    { emotion_id: 7, code: 'tired', name: 'Cansancio' },
  ],
  pillars: [
    {
      pillar_code: 'BODY',
      tasks: [
        { task_id: 'dq-body-1', name: 'Dormir 8hs', trait_id: null, difficulty: 'Medium', difficulty_id: 2, xp: 3 },
        { task_id: 'dq-body-2', name: 'Hacer ejercicios de estiramiento y movilidad', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
        { task_id: 'dq-body-3', name: '10.000 pasos / Correr', trait_id: null, difficulty: 'Hard', difficulty_id: 3, xp: 7 },
        { task_id: 'dq-body-4', name: '20` Sin pantallas antes de dormir', trait_id: null, difficulty: 'Medium', difficulty_id: 2, xp: 3 },
        { task_id: 'dq-body-5', name: '2L de agua', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
      ],
    },
    {
      pillar_code: 'MIND',
      tasks: [
        { task_id: 'dq-mind-1', name: '15 min de lectura enfocada', trait_id: null, difficulty: 'Medium', difficulty_id: 2, xp: 3 },
      ],
    },
    {
      pillar_code: 'SOUL',
      tasks: [
        { task_id: 'dq-soul-1', name: '10 min de respiración consciente', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
      ],
    },
  ],
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
  missions_v2: {
    bonus_ready: boolean;
    redirect_url: string;
    tasks: Array<{
      mission_id: string;
      mission_name: string;
      slot: string;
      task_id: string;
      task_name: string;
    }>;
  };
  feedback_events?: SubmitDailyQuestFeedbackEvent[];
};

export type SubmitDailyQuestFeedbackEvent =
  | {
      type: 'level_up';
      notificationKey: 'inapp_level_up_popup';
      payload: { level: number; previousLevel: number };
    }
  | {
      type: 'streak_milestone';
      notificationKey: 'inapp_streak_fire_popup';
      payload: {
        threshold: number;
        tasks: Array<{ id: string; name: string; streakDays: number }>;
      };
    };

export type SubmitDailyQuestPayload = {
  date?: string;
  emotion_id: number;
  tasks_done: string[];
  notes?: string | null;
};

export async function getDailyQuestStatus(params: { date?: string } = {}): Promise<DailyQuestStatusResponse> {
  if (isDashboardDemoModeEnabled()) {
    return cloneDemo({
      ...DEMO_DAILY_QUEST_STATUS,
      ...(params.date ? { date: params.date } : {}),
    });
  }

  const response = await getAuthorizedJson<DailyQuestStatusResponse>('/daily-quest/status', params);
  logShape('daily-quest-status', response);
  return response;
}

export async function getDailyQuestDefinition(
  params: { date?: string } = {},
): Promise<DailyQuestDefinitionResponse> {
  if (isDashboardDemoModeEnabled()) {
    return cloneDemo({
      ...DEMO_DAILY_QUEST_DEFINITION,
      ...(params.date ? { date: params.date } : {}),
    });
  }

  const response = await getAuthorizedJson<DailyQuestDefinitionResponse>('/daily-quest/definition', params);
  logShape('daily-quest-definition', response);
  return response;
}

export async function submitDailyQuest(payload: SubmitDailyQuestPayload): Promise<SubmitDailyQuestResponse> {
  if (isDashboardDemoModeEnabled()) {
    return cloneDemo({
      ok: true,
      saved: {
        emotion: {
          emotion_id: payload.emotion_id,
          date: payload.date ?? DEMO_TODAY,
          notes: payload.notes ?? null,
        },
        tasks: {
          date: payload.date ?? DEMO_TODAY,
          completed: payload.tasks_done,
        },
      },
      xp_delta: Math.max(0, payload.tasks_done.length * 2),
      xp_total_today: 124 + Math.max(0, payload.tasks_done.length * 2),
      streaks: { daily: 11, weekly: 3 },
      missions_v2: {
        bonus_ready: false,
        redirect_url: '/dashboard-v3/missions-v3',
        tasks: [],
      },
      feedback_events: [],
    });
  }

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



export async function getModerationState(): Promise<ModerationStateResponse> {
  if (isDashboardDemoModeEnabled()) {
    return cloneDemo(demoModerationState);
  }
  const response = await getAuthorizedJson<ModerationStateResponse>('/moderation');
  logShape('moderation-state', response);
  return response;
}

export async function updateModerationStatus(
  type: ModerationTrackerType,
  payload: { dayKey: string; status: ModerationStatus },
): Promise<ModerationStateResponse> {
  if (isDashboardDemoModeEnabled()) {
    demoModerationState = {
      ...demoModerationState,
      dayKey: payload.dayKey || demoModerationState.dayKey,
      trackers: demoModerationState.trackers.map((tracker) =>
        tracker.type === type ? { ...tracker, statusToday: payload.status } : tracker,
      ),
    };
    return cloneDemo(demoModerationState);
  }
  const token = await resolveAuthToken();
  const url = buildUrl(`/moderation/${type}/status`);
  const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
  const init = applyAuthorization({ method: 'PUT', headers, body: JSON.stringify(payload) }, token);
  const response = await apiRequest<ModerationStateResponse>(url, init);
  logShape('moderation-status-update', response);
  return response;
}

export async function updateModerationConfig(
  type: ModerationTrackerType,
  payload: { isEnabled?: boolean; isPaused?: boolean; notLoggedToleranceDays?: number },
): Promise<ModerationStateResponse> {
  const token = await resolveAuthToken();
  const url = buildUrl(`/moderation/${type}/config`);
  const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json' });
  const init = applyAuthorization({ method: 'PUT', headers, body: JSON.stringify(payload) }, token);
  const response = await apiRequest<ModerationStateResponse>(url, init);
  logShape('moderation-config-update', response);
  return response;
}

async function missionsV2AuthorizedPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const token = await resolveAuthToken();
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  const init = applyAuthorization(
    {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    },
    token,
  );

  const url = buildUrl(path);
  return apiRequest<T>(url, init);
}

export async function getMissionsV2Board(): Promise<MissionsV2BoardResponse> {
  if (DEV_USER_SWITCH_ENABLED) {
    const board = await loadDevBoard(getDevUserOverride());
    if (board) {
      logShape('missions-v2-board-dev', board);
      return board;
    }
  }
  const response = await getAuthorizedJson<MissionsV2BoardResponse>('/missions/board');
  logShape('missions-v2-board', response);
  return response;
}

export async function postMissionsV2Heartbeat(missionId: string): Promise<MissionsV2HeartbeatResponse> {
  const response = await missionsV2AuthorizedPost<MissionsV2HeartbeatResponse>('/missions/heartbeat', {
    missionId,
  });
  logShape('missions-v2-heartbeat', response);
  return response;
}

export async function linkMissionsV2Daily(
  missionId: string,
  taskId: string,
): Promise<MissionsV2LinkDailyResponse> {
  const response = await missionsV2AuthorizedPost<MissionsV2LinkDailyResponse>('/missions/link-daily', {
    mission_id: missionId,
    task_id: taskId,
  });
  logShape('missions-v2-link-daily', response);
  return response;
}

export async function claimMissionsV2Mission(missionId: string): Promise<MissionsV2ClaimResponse> {
  const response = await missionsV2AuthorizedPost<MissionsV2ClaimResponse>(
    `/missions/${encodeURIComponent(missionId)}/claim`,
  );
  logShape('missions-v2-claim', response);
  return response;
}
