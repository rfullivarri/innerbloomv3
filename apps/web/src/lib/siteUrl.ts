import { isNativeCapacitorPlatform } from '../mobile/capacitor';

const DEFAULT_PRODUCTION_WEB_BASE_URL = 'https://innerbloomjourney.org';

function normalizeBaseUrl(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return null;
  }
}

export function getWebBaseUrl(): string {
  const configured =
    normalizeBaseUrl(import.meta.env.VITE_WEB_BASE_URL) ??
    normalizeBaseUrl(import.meta.env.VITE_SITE_URL);

  if (configured) {
    return configured;
  }

  if (typeof window !== 'undefined') {
    if (isNativeCapacitorPlatform()) {
      return DEFAULT_PRODUCTION_WEB_BASE_URL;
    }

    return window.location.origin;
  }

  return DEFAULT_PRODUCTION_WEB_BASE_URL;
}

export function buildWebAbsoluteUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWebBaseUrl()}${normalizedPath}`;
}
