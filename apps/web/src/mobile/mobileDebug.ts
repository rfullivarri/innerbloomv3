type MobileDebugPayload = Record<string, unknown>;

const MOBILE_DEBUG_STORAGE_KEY = 'innerbloom.mobile.debug.v1';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function writeMobileDebug(key: string, payload: MobileDebugPayload): void {
  if (!canUseStorage()) {
    return;
  }

  const nextEntry = {
    key,
    payload,
    updatedAt: Date.now(),
  };

  try {
    const currentRaw = window.localStorage.getItem(MOBILE_DEBUG_STORAGE_KEY);
    const current = currentRaw ? JSON.parse(currentRaw) as Record<string, unknown> : {};
    const next = {
      ...(current && typeof current === 'object' ? current : {}),
      [key]: nextEntry,
    };
    window.localStorage.setItem(MOBILE_DEBUG_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[mobile-debug] failed to persist debug state', { key, error });
  }
}

