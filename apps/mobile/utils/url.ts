const DEFAULT_BASE_URL = 'https://web-dev-dfa2.up.railway.app';

export function normalizeBaseUrl(raw?: string | null) {
  const trimmed = raw?.trim();

  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.toString();
  } catch (error) {
    console.warn('Invalid EXPO_PUBLIC_WEB_BASE_URL, falling back to default', error);
    return DEFAULT_BASE_URL;
  }
}

export function buildAppUrl(base: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, base);
  url.searchParams.set('app', '1');
  return url.toString();
}

export { DEFAULT_BASE_URL };
