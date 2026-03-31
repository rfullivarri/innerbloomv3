import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/runtimeAuth';
import { readCookieConsentState } from '../lib/cookieConsent';
import { ensureGa4Initialized, sendGaEvent } from '../lib/ga4';

const GA4_MEASUREMENT_ID = (
  import.meta.env.VITE_GA4_MEASUREMENT_ID
  ?? import.meta.env.VITE_GA_MEASUREMENT_ID
  ?? ''
).trim();

const AUTH_SURFACE_STORAGE_KEY = 'ib:ga4:last-auth-surface';
const AUTH_SURFACE_UNKNOWN = 'unknown';
type AuthenticatedView = 'dashboard_home' | 'missions' | 'dquest' | 'rewards' | 'editor';

function isAuthLoginPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

function isAuthSignUpPath(pathname: string): boolean {
  return pathname === '/sign-up' || pathname.startsWith('/sign-up/');
}

function getAuthSurfaceFromPath(pathname: string): 'login' | 'sign_up' | null {
  if (isAuthLoginPath(pathname)) {
    return 'login';
  }

  if (isAuthSignUpPath(pathname)) {
    return 'sign_up';
  }

  return null;
}

function readLastAuthSurface(): string {
  if (typeof window === 'undefined') {
    return AUTH_SURFACE_UNKNOWN;
  }

  const raw = window.sessionStorage.getItem(AUTH_SURFACE_STORAGE_KEY);
  if (!raw) {
    return AUTH_SURFACE_UNKNOWN;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized.length > 0 ? normalized : AUTH_SURFACE_UNKNOWN;
}

function writeLastAuthSurface(surface: 'login' | 'sign_up'): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(AUTH_SURFACE_STORAGE_KEY, surface);
}

function resolveAuthenticatedView(pathname: string, dashboardBasePath: string): AuthenticatedView | null {
  if (pathname === '/editor' || pathname.startsWith('/editor/')) {
    return 'editor';
  }

  if (pathname === dashboardBasePath) {
    return 'dashboard_home';
  }

  if (!pathname.startsWith(`${dashboardBasePath}/`)) {
    return null;
  }

  const suffix = pathname.slice(dashboardBasePath.length + 1);

  if (suffix === 'rewards' || suffix.startsWith('rewards/')) {
    return 'rewards';
  }

  if (
    suffix === 'misiones'
    || suffix.startsWith('misiones/')
    || suffix === 'missions'
    || suffix.startsWith('missions/')
    || suffix === 'missions-v2'
    || suffix.startsWith('missions-v2/')
    || suffix === 'missions-v3'
    || suffix.startsWith('missions-v3/')
  ) {
    return 'missions';
  }

  if (suffix === 'dquest' || suffix.startsWith('dquest/')) {
    return 'dquest';
  }

  return null;
}

export function useGa4FunnelTracking({ dashboardBasePath }: { dashboardBasePath: string }) {
  const location = useLocation();
  const { isLoaded, userId } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const trackedAuthPageViewsRef = useRef<Set<string>>(new Set());
  const trackedAuthStartedRef = useRef<Set<string>>(new Set());
  const trackedDashboardViewRef = useRef(false);
  const previousAuthenticatedViewRef = useRef<AuthenticatedView | null>(null);
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const consent = readCookieConsentState().analytics;
    if (consent !== 'accepted' || !GA4_MEASUREMENT_ID) {
      setIsReady(false);
      return;
    }

    let cancelled = false;
    void ensureGa4Initialized(GA4_MEASUREMENT_ID)
      .then(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('[ga4] funnel tracking initialization failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const authSurface = getAuthSurfaceFromPath(location.pathname);
    if (!authSurface) {
      return;
    }

    const pageType = authSurface === 'login' ? 'auth_login' : 'auth_signup';
    const dedupeKey = `${authSurface}:${location.pathname}`;

    if (!trackedAuthPageViewsRef.current.has(dedupeKey)) {
      trackedAuthPageViewsRef.current.add(dedupeKey);
      sendGaEvent('page_view', {
        page_path: location.pathname,
        page_type: pageType,
      });
    }

    if (!trackedAuthStartedRef.current.has(dedupeKey)) {
      trackedAuthStartedRef.current.add(dedupeKey);
      sendGaEvent('auth_started', {
        auth_surface: authSurface,
        auth_method: 'unknown',
        page_path: location.pathname,
      });
    }

    writeLastAuthSurface(authSurface);
  }, [isReady, location.pathname]);

  useEffect(() => {
    if (!isReady || !isLoaded) {
      return;
    }

    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = userId ?? null;
      return;
    }

    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId ?? null;

    if (!previousUserId && userId) {
      sendGaEvent('auth_completed', {
        auth_surface: readLastAuthSurface(),
        auth_method: 'unknown',
        redirect_target: location.pathname,
      });
    }
  }, [isLoaded, isReady, location.pathname, userId]);

  useEffect(() => {
    if (!isReady || trackedDashboardViewRef.current) {
      return;
    }

    const isDashboardPath = location.pathname === dashboardBasePath
      || location.pathname.startsWith(`${dashboardBasePath}/`);

    if (!isDashboardPath) {
      return;
    }

    trackedDashboardViewRef.current = true;
    sendGaEvent('dashboard_view', {
      page_path: location.pathname,
      page_type: 'dashboard',
      is_first_dashboard_view: true,
    });
  }, [dashboardBasePath, isReady, location.pathname]);

  useEffect(() => {
    if (!isReady || !isLoaded || !userId) {
      return;
    }

    const currentView = resolveAuthenticatedView(location.pathname, dashboardBasePath);
    if (!currentView) {
      return;
    }

    const previousView = previousAuthenticatedViewRef.current;
    previousAuthenticatedViewRef.current = currentView;

    sendGaEvent('app_section_view', {
      section_name: currentView,
      previous_section: previousView ?? 'none',
      page_path: location.pathname,
      is_authenticated: true,
    });
  }, [dashboardBasePath, isLoaded, isReady, location.pathname, userId]);
}
