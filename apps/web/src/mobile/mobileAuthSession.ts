import { useEffect, useState } from 'react';
import {
  CAPACITOR_CALLBACK_HOST,
  CAPACITOR_SIGNED_OUT_HOST,
  isNativeAuthCallbackUrl,
} from './capacitor';
import { writeMobileDebug } from './mobileDebug';

export type MobileAuthSession = {
  token: string;
  clerkUserId: string | null;
  email: string | null;
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

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16);
}

function getCallbackFingerprint(url: string): string | null {
  if (!isNativeAuthCallbackUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get('token')?.trim() ?? '';
    const userId = parsed.searchParams.get('user_id')?.trim() ?? '';
    const email = parsed.searchParams.get('email')?.trim() ?? '';
    return hashString([parsed.protocol, parsed.hostname, token, userId, email].join('|'));
  } catch {
    return null;
  }
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

    return {
      token: parsed.token,
      clerkUserId: typeof parsed.clerkUserId === 'string' ? parsed.clerkUserId : null,
      email: typeof parsed.email === 'string' ? parsed.email : null,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function persistMobileAuthSession(session: MobileAuthSession): MobileAuthSession {
  if (!canUseStorage()) {
    return session;
  }

  window.localStorage.setItem(MOBILE_AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  emitMobileAuthSessionChange();
  return session;
}

export function clearMobileAuthSession(): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(MOBILE_AUTH_SESSION_STORAGE_KEY);
  emitMobileAuthSessionChange();
}

export function resolveMobileAuthSessionFromCallback(url: string): MobileAuthCallbackResolution {
  if (!isNativeAuthCallbackUrl(url)) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const fingerprint = getCallbackFingerprint(url);

    if (!fingerprint) {
      return null;
    }

    if (getStoredCallbackFingerprint() === fingerprint) {
      writeMobileDebug('mobile-auth-callback', {
        type: 'duplicate',
        hasToken: Boolean(parsed.searchParams.get('token')?.trim()),
      });
      console.info('[mobile-auth] ignored duplicate callback', {
        type: parsed.hostname,
      });
      return {
        type: 'duplicate',
        fingerprint,
      };
    }

    if (parsed.hostname === CAPACITOR_SIGNED_OUT_HOST) {
      clearMobileAuthSession();
      setStoredCallbackFingerprint(fingerprint);
      writeMobileDebug('mobile-auth-callback', {
        type: 'signed-out',
        hasToken: false,
      });
      console.info('[mobile-auth] cleared persisted session from signed-out callback');
      return {
        type: 'signed-out',
        fingerprint,
      };
    }

    if (parsed.hostname !== CAPACITOR_CALLBACK_HOST) {
      return null;
    }

    const token = parsed.searchParams.get('token')?.trim();
    if (!token) {
      writeMobileDebug('mobile-auth-callback', {
        type: 'callback-missing-token',
        hasToken: false,
        url,
      });
      console.warn('[mobile-auth] callback received without token', { url });
      return null;
    }

    const session = persistMobileAuthSession({
      token,
      clerkUserId: parsed.searchParams.get('user_id')?.trim() || null,
      email: parsed.searchParams.get('email')?.trim() || null,
      updatedAt: Date.now(),
    });
    setStoredCallbackFingerprint(fingerprint);

    console.info('[mobile-auth] persisted callback session', {
      hasToken: true,
      clerkUserId: session.clerkUserId,
      email: session.email,
    });
    writeMobileDebug('mobile-auth-callback', {
      type: 'callback',
      hasToken: true,
      clerkUserId: session.clerkUserId,
      email: session.email,
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
