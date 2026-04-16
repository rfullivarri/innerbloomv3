import { useEffect, useState } from 'react';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { buildWebAbsoluteUrl } from '../lib/siteUrl';
import {
  buildNativeAppUrl,
  CAPACITOR_APP_SCHEME,
  CAPACITOR_APP_HOST,
  CAPACITOR_CALLBACK_HOST,
  CAPACITOR_SIGNED_OUT_HOST,
  isNativeAuthCallbackUrl,
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from './capacitor';
import { writeMobileDebug } from './mobileDebug';

export type MobileAuthMode = 'sign-in' | 'sign-up' | 'refresh' | 'logout';

export type MobileAuthSession = {
  token: string;
  clerkUserId: string | null;
  email: string | null;
  authMode: MobileAuthMode | null;
  expiresAt: number | null;
  updatedAt: number;
};

export type MobileAuthCallbackResolution =
  | { type: 'session'; session: MobileAuthSession; fingerprint: string }
  | { type: 'signed-out'; fingerprint: string }
  | { type: 'duplicate'; fingerprint: string }
  | null;

const MOBILE_AUTH_SESSION_STORAGE_KEY = 'innerbloom.mobile.auth-session.v1';
const MOBILE_AUTH_SESSION_EVENT = 'innerbloom:mobile-auth-session-changed';
const MOBILE_AUTH_CALLBACK_FINGERPRINT_STORAGE_KEY = 'innerbloom.mobile.auth-callback.last-fingerprint.v1';
const MOBILE_AUTH_FORCE_WELCOME_STORAGE_KEY = 'innerbloom.mobile.auth.force-welcome.v1';
const MOBILE_AUTH_REFRESH_TIMEOUT_MS = 15_000;
const MOBILE_AUTH_REFRESH_MIN_VALIDITY_MS = 10_000;
const MOBILE_AUTH_REFRESH_COOLDOWN_MS = 10_000;

let mobileAuthRefreshPromise: Promise<MobileAuthSession | null> | null = null;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitMobileAuthSessionChange() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(MOBILE_AUTH_SESSION_EVENT));
}

function getStoredCallbackFingerprint(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(MOBILE_AUTH_CALLBACK_FINGERPRINT_STORAGE_KEY);
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function setStoredCallbackFingerprint(fingerprint: string): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(MOBILE_AUTH_CALLBACK_FINGERPRINT_STORAGE_KEY, fingerprint);
}

export function shouldForceNativeWelcome(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.sessionStorage.getItem(MOBILE_AUTH_FORCE_WELCOME_STORAGE_KEY) === '1';
}

export function setForceNativeWelcome(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (enabled) {
    window.sessionStorage.setItem(MOBILE_AUTH_FORCE_WELCOME_STORAGE_KEY, '1');
    return;
  }

  window.sessionStorage.removeItem(MOBILE_AUTH_FORCE_WELCOME_STORAGE_KEY);
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

export function getMobileAuthTokenFingerprint(token: string | null | undefined): string | null {
  if (typeof token !== 'string') {
    return null;
  }

  const normalized = token.trim();
  if (!normalized) {
    return null;
  }

  return hashString(normalized);
}

function describeNativeCallback(url: string): Record<string, unknown> {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      pathname: parsed.pathname,
      hasToken: Boolean(parsed.searchParams.get('token')?.trim()),
      authMode: parsed.searchParams.get('auth_mode')?.trim() ?? null,
      userId: parsed.searchParams.get('user_id')?.trim() ?? null,
    };
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

type ParsedNativeCallback = {
  normalizedUrl: string;
  callbackType: 'callback' | 'signed-out';
  authorityAndPath: string;
  params: URLSearchParams;
};

function parseNativeCallbackUrl(url: string): ParsedNativeCallback | null {
  const normalizedUrl = typeof url === 'string' ? url.trim() : '';
  if (!isNativeAuthCallbackUrl(normalizedUrl)) {
    return null;
  }

  let rest = normalizedUrl;
  const schemePrefix = `${buildNativeAppUrl('')}`.replace(/\/$/, '');
  if (rest.startsWith(`${CAPACITOR_APP_SCHEME}://`)) {
    rest = rest.slice(`${CAPACITOR_APP_SCHEME}://`.length);
  } else if (rest.startsWith(schemePrefix)) {
    rest = rest.slice(schemePrefix.length);
  }

  const [authorityAndPathRaw, queryAndHash = ''] = rest.split('?', 2);
  const authorityAndPath = authorityAndPathRaw.replace(/\/+$/, '');
  const query = queryAndHash.split('#', 1)[0] ?? '';

  let callbackType: 'callback' | 'signed-out' | null = null;
  if (
    authorityAndPath === CAPACITOR_CALLBACK_HOST
    || authorityAndPath === `${CAPACITOR_APP_HOST}/${CAPACITOR_CALLBACK_HOST}`
  ) {
    callbackType = 'callback';
  } else if (
    authorityAndPath === CAPACITOR_SIGNED_OUT_HOST
    || authorityAndPath === `${CAPACITOR_APP_HOST}/${CAPACITOR_SIGNED_OUT_HOST}`
  ) {
    callbackType = 'signed-out';
  }

  if (!callbackType) {
    return null;
  }

  return {
    normalizedUrl,
    callbackType,
    authorityAndPath,
    params: new URLSearchParams(query),
  };
}

function getCallbackFingerprint(url: string): string | null {
  const parsed = parseNativeCallbackUrl(url);
  if (!parsed) {
    return null;
  }

  const token = parsed.params.get('token')?.trim() ?? '';
  const userId = parsed.params.get('user_id')?.trim() ?? '';
  const email = parsed.params.get('email')?.trim() ?? '';
  const authMode = parsed.params.get('auth_mode')?.trim() ?? '';
  return hashString([
    CAPACITOR_APP_SCHEME,
    parsed.authorityAndPath,
    token,
    userId,
    email,
    authMode,
  ].join('|'));
}

function normalizeAuthMode(value: string | null | undefined): MobileAuthMode | null {
  if (value === 'sign-in' || value === 'sign-up' || value === 'refresh' || value === 'logout') {
    return value;
  }

  return null;
}

function decodeJwtExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const decoded = atob(`${normalized}${padding}`);
    const payload = JSON.parse(decoded) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function normalizeSession(session: Partial<MobileAuthSession> & { token: string }): MobileAuthSession {
  return {
    token: session.token,
    clerkUserId: typeof session.clerkUserId === 'string' ? session.clerkUserId : null,
    email: typeof session.email === 'string' ? session.email : null,
    authMode: normalizeAuthMode(session.authMode),
    expiresAt: typeof session.expiresAt === 'number' ? session.expiresAt : decodeJwtExp(session.token),
    updatedAt: typeof session.updatedAt === 'number' ? session.updatedAt : Date.now(),
  };
}

export function isMobileAuthSessionExpiringSoon(
  session: MobileAuthSession | null | undefined,
  minValidityMs = MOBILE_AUTH_REFRESH_MIN_VALIDITY_MS,
): boolean {
  if (!session?.token) {
    return false;
  }

  if (!session.expiresAt) {
    return false;
  }

  return session.expiresAt - Date.now() <= minValidityMs;
}

export function buildNativeMobileAuthUrl(
  mode: MobileAuthMode,
  language?: string,
  options?: {
    provider?: 'google';
  },
): string {
  const resolvedLanguage =
    language === 'es' || language === 'en'
      ? language
      : resolveAuthLanguage(typeof window !== 'undefined' ? window.location.search : '');
  const mobileAuthUrl = new URL(buildWebAbsoluteUrl(buildLocalizedAuthPath('/mobile-auth', resolvedLanguage)));
  mobileAuthUrl.searchParams.set('mode', mode);
  mobileAuthUrl.searchParams.set(
    'return_to',
    buildNativeAppUrl(mode === 'logout' ? CAPACITOR_SIGNED_OUT_HOST : CAPACITOR_CALLBACK_HOST),
  );
  if (options?.provider === 'google') {
    mobileAuthUrl.searchParams.set('provider', 'google');
  }
  return mobileAuthUrl.toString();
}

function waitForMobileAuthSessionUpdate(previousUpdatedAt: number, timeoutMs: number): Promise<MobileAuthSession | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const existing = getMobileAuthSession();
    if (existing && existing.updatedAt > previousUpdatedAt) {
      resolve(existing);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.removeEventListener(MOBILE_AUTH_SESSION_EVENT, handleRefresh);
      resolve(getMobileAuthSession());
    }, timeoutMs);

    const handleRefresh = () => {
      const next = getMobileAuthSession();
      if (next && next.updatedAt > previousUpdatedAt) {
        window.clearTimeout(timeoutId);
        window.removeEventListener(MOBILE_AUTH_SESSION_EVENT, handleRefresh);
        resolve(next);
      }
    };

    window.addEventListener(MOBILE_AUTH_SESSION_EVENT, handleRefresh);
  });
}

export async function ensureFreshMobileAuthSession(options?: {
  force?: boolean;
  reason?: string;
  timeoutMs?: number;
  minValidityMs?: number;
}): Promise<MobileAuthSession | null> {
  const session = getMobileAuthSession();
  if (!isNativeCapacitorPlatform() || !session?.token) {
    return session;
  }

  const force = options?.force ?? false;
  const timeoutMs = options?.timeoutMs ?? MOBILE_AUTH_REFRESH_TIMEOUT_MS;
  const minValidityMs = options?.minValidityMs ?? MOBILE_AUTH_REFRESH_MIN_VALIDITY_MS;
  const ageMs = Date.now() - session.updatedAt;
  const inRefreshCooldown = ageMs < MOBILE_AUTH_REFRESH_COOLDOWN_MS;

  if (!force && !isMobileAuthSessionExpiringSoon(session, minValidityMs)) {
    return session;
  }

  if (!force && inRefreshCooldown) {
    writeMobileDebug('mobile-auth-refresh-skipped', {
      reason: options?.reason ?? 'unspecified',
      refreshCooldownMs: MOBILE_AUTH_REFRESH_COOLDOWN_MS,
      ageMs,
      authMode: session.authMode,
      expiresAt: session.expiresAt,
    });
    console.info('[mobile-auth] skipped refresh during callback cooldown', {
      reason: options?.reason ?? 'unspecified',
      refreshCooldownMs: MOBILE_AUTH_REFRESH_COOLDOWN_MS,
      ageMs,
      authMode: session.authMode,
      expiresAt: session.expiresAt,
    });
    return session;
  }

  if (mobileAuthRefreshPromise) {
    return mobileAuthRefreshPromise;
  }

  const refreshMode: MobileAuthMode = 'refresh';
  const refreshUrl = buildNativeMobileAuthUrl(refreshMode);
  writeMobileDebug('mobile-auth-refresh', {
    reason: options?.reason ?? 'unspecified',
    force,
    hasToken: true,
    authMode: session.authMode,
    expiresAt: session.expiresAt,
    refreshMode,
  });
  console.info('[mobile-auth] refreshing callback token', {
    reason: options?.reason ?? 'unspecified',
    force,
    authMode: session.authMode,
    expiresAt: session.expiresAt,
  });

  mobileAuthRefreshPromise = (async () => {
    try {
      await openUrlInCapacitorBrowser(refreshUrl);
      return await waitForMobileAuthSessionUpdate(session.updatedAt, timeoutMs);
    } finally {
      mobileAuthRefreshPromise = null;
    }
  })();

  return mobileAuthRefreshPromise;
}

export function getMobileAuthSession(): MobileAuthSession | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = window.localStorage.getItem(MOBILE_AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<MobileAuthSession>;
    if (!parsed?.token || typeof parsed.token !== 'string') {
      return null;
    }

    return normalizeSession({ ...parsed, token: parsed.token });
  } catch {
    return null;
  }
}

export function persistMobileAuthSession(session: MobileAuthSession): MobileAuthSession {
  if (!canUseStorage()) {
    return normalizeSession(session);
  }

  const normalized = normalizeSession(session);
  window.localStorage.setItem(MOBILE_AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalized));
  console.info('[mobile-auth] persistMobileAuthSession()', {
    at: Date.now(),
    clerkUserId: normalized.clerkUserId,
    authMode: normalized.authMode,
    expiresAt: normalized.expiresAt,
    tokenFingerprint: getMobileAuthTokenFingerprint(normalized.token),
  });
  emitMobileAuthSessionChange();
  return normalized;
}

export function clearMobileAuthSession(
  reason?: string,
  details?: Record<string, unknown>,
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(MOBILE_AUTH_SESSION_STORAGE_KEY);
  if (reason) {
    writeMobileDebug('mobile-auth-session-cleared', {
      reason,
      ...(details ?? {}),
    });
    console.warn('[mobile-auth] cleared persisted session', {
      reason,
      ...(details ?? {}),
    });
  }
  emitMobileAuthSessionChange();
}

export function resolveMobileAuthSessionFromCallback(url: string): MobileAuthCallbackResolution {
  const normalizedUrl = typeof url === 'string' ? url.trim() : '';
  if (!isNativeAuthCallbackUrl(normalizedUrl)) {
    console.info('[mobile-auth] callback rejected before resolution', {
      reason: 'not-native-auth-callback',
      url: normalizedUrl,
    });
    return null;
  }

  try {
    const parsed = parseNativeCallbackUrl(normalizedUrl);
    const callbackType = parsed?.callbackType ?? null;
    const fingerprint = getCallbackFingerprint(normalizedUrl);
    const storedFingerprint = getStoredCallbackFingerprint();

    console.info('[mobile-auth] resolving callback', {
      ...describeNativeCallback(normalizedUrl),
      authorityAndPath: parsed?.authorityAndPath ?? null,
      callbackType,
      fingerprint,
      storedFingerprint,
    });

    if (!callbackType || !fingerprint) {
      console.warn('[mobile-auth] callback resolution failed', {
        reason: !callbackType ? 'missing-callback-type' : 'missing-fingerprint',
        ...describeNativeCallback(normalizedUrl),
        callbackType,
        fingerprint,
        storedFingerprint,
      });
      return null;
    }

    if (storedFingerprint === fingerprint) {
      writeMobileDebug('mobile-auth-callback', {
        type: 'duplicate',
        hasToken: Boolean(parsed?.params.get('token')?.trim()),
      });
      console.info('[mobile-auth] ignored duplicate callback', {
        type: callbackType,
      });
      return {
        type: 'duplicate',
        fingerprint,
      };
    }

    if (callbackType === 'signed-out') {
      setForceNativeWelcome(true);
      clearMobileAuthSession();
      setStoredCallbackFingerprint(fingerprint);
      writeMobileDebug('mobile-auth-callback', {
        type: 'signed-out',
        hasToken: false,
      });
      console.info('[mobile-auth] cleared persisted session from signed-out callback', {
        at: Date.now(),
      });
      return {
        type: 'signed-out',
        fingerprint,
      };
    }

    const token = parsed?.params.get('token')?.trim();
    if (!token) {
      writeMobileDebug('mobile-auth-callback', {
        type: 'callback-missing-token',
        hasToken: false,
        url: normalizedUrl,
      });
      console.warn('[mobile-auth] callback received without token', { url: normalizedUrl });
      return null;
    }

    const session = persistMobileAuthSession({
      token,
      clerkUserId: parsed?.params.get('user_id')?.trim() || null,
      email: parsed?.params.get('email')?.trim() || null,
      authMode: normalizeAuthMode(parsed?.params.get('auth_mode')?.trim()),
      expiresAt: decodeJwtExp(token),
      updatedAt: Date.now(),
    });
    setForceNativeWelcome(false);
    setStoredCallbackFingerprint(fingerprint);

    console.info('[mobile-auth] persisted callback session', {
      at: Date.now(),
      hasToken: true,
      clerkUserId: session.clerkUserId,
      email: session.email,
      authMode: session.authMode,
      expiresAt: session.expiresAt,
      tokenFingerprint: getMobileAuthTokenFingerprint(session.token),
    });
    writeMobileDebug('mobile-auth-callback', {
      type: 'callback',
      hasToken: true,
      clerkUserId: session.clerkUserId,
      email: session.email,
      authMode: session.authMode,
      expiresAt: session.expiresAt,
    });

    return {
      type: 'session',
      session,
      fingerprint,
    };
  } catch (error) {
    writeMobileDebug('mobile-auth-callback', {
      type: 'parse-error',
      hasToken: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('[mobile-auth] failed to parse auth callback', error);
    return null;
  }
}

export function useMobileAuthSession() {
  const [session, setSession] = useState<MobileAuthSession | null>(() => getMobileAuthSession());

  useEffect(() => {
    const refresh = () => {
      setSession(getMobileAuthSession());
    };

    refresh();
    window.addEventListener(MOBILE_AUTH_SESSION_EVENT, refresh);

    return () => {
      window.removeEventListener(MOBILE_AUTH_SESSION_EVENT, refresh);
    };
  }, []);

  return session;
}
