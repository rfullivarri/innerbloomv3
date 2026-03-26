export type AnalyticsConsentStatus = 'accepted' | 'rejected' | 'unset';

export type CookieConsentState = {
  analytics: AnalyticsConsentStatus;
  updatedAt: string | null;
};

const STORAGE_KEY = 'ib:cookie-consent:v1';

const DEFAULT_STATE: CookieConsentState = {
  analytics: 'unset',
  updatedAt: null,
};

export function readCookieConsentState(): CookieConsentState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return DEFAULT_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    const analytics = parsed.analytics === 'accepted' || parsed.analytics === 'rejected'
      ? parsed.analytics
      : 'unset';

    return {
      analytics,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function persistCookieConsentState(analytics: Exclude<AnalyticsConsentStatus, 'unset'>): CookieConsentState {
  const nextState: CookieConsentState = {
    analytics,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  return nextState;
}
