import { Capacitor } from '@capacitor/core';

export const CAPACITOR_APP_SCHEME = 'innerbloom';
export const CAPACITOR_CALLBACK_HOST = 'callback';
export const CAPACITOR_SIGNED_OUT_HOST = 'signed-out';

export function isNativeCapacitorPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function normalizeAppUrlToPath(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol === `${CAPACITOR_APP_SCHEME}:`) {
      const hostPath = parsed.hostname ? `/${parsed.hostname}` : '';
      const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
      const combined = `${hostPath}${pathname}${parsed.search}${parsed.hash}` || '/';
      return combined.startsWith('/') ? combined : `/${combined}`;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return null;
  }
}

export function isNativeAuthCallbackUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${CAPACITOR_APP_SCHEME}:`) {
      return false;
    }

    return parsed.hostname === CAPACITOR_CALLBACK_HOST || parsed.hostname === CAPACITOR_SIGNED_OUT_HOST;
  } catch {
    return false;
  }
}

export function shouldOpenExternalUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.href);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }

    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}
