import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from '../config/auth';
import {
  CAPACITOR_KEYBOARD_RESIZE_NATIVE,
  CAPACITOR_KEYBOARD_STYLE_DARK,
  CAPACITOR_STATUS_BAR_STYLE_DARK,
  closeCapacitorBrowser,
  getCapacitorAppPlugin,
  getCapacitorBrowserPlugin,
  getCapacitorKeyboardPlugin,
  getCapacitorLocalNotificationsPlugin,
  getCapacitorPlatform,
  getCapacitorStatusBarPlugin,
  isNativeAuthCallbackUrl,
  isNativeCapacitorPlatform,
  normalizeAppUrlToPath,
  scheduleCapacitorBrowserCloseRetries,
  shouldOpenExternalUrl,
} from './capacitor';
import { DAILY_REMINDER_NOTIFICATION_TARGET_PATH } from './localNotifications';
import { resolveMobileAuthSessionFromCallback } from './mobileAuthSession';

const MOBILE_AUTH_CONSUMED_LAUNCH_FINGERPRINT_KEY = 'innerbloom.mobile.auth.launch-consumed.v1';

function getConsumedLaunchFingerprint(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(MOBILE_AUTH_CONSUMED_LAUNCH_FINGERPRINT_KEY);
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function setConsumedLaunchFingerprint(fingerprint: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(MOBILE_AUTH_CONSUMED_LAUNCH_FINGERPRINT_KEY, fingerprint);
}

function getCurrentAppPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  const { pathname, search, hash } = window.location;
  return `${pathname || '/'}${search || ''}${hash || ''}`;
}

function resolveCallbackTargetPath(
  authMode: string | null | undefined,
  currentPath: string,
): string {
  const dashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;

  if (authMode === 'sign-in') {
    return dashboardPath;
  }

  if (authMode === 'sign-up') {
    return '/intro-journey';
  }

  if (authMode === 'refresh') {
    return currentPath || dashboardPath;
  }

  return '/';
}

function useNativeDocumentClass(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const className = 'capacitor-native';
    document.documentElement.classList.add(className);
    document.body.classList.add(className);

    return () => {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    };
  }, [enabled]);
}

function useExternalLinkBridge(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const originalOpen = window.open.bind(window);

    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const href = typeof url === 'string' ? url : url?.toString() ?? '';
      if (href && shouldOpenExternalUrl(href)) {
        const browser = getCapacitorBrowserPlugin();
        if (browser) {
          void browser.open({ url: new URL(href, window.location.href).toString() });
          return null;
        }

        return null;
      }

      return originalOpen(url as string | URL | undefined, target, features);
    }) as typeof window.open;

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }

      if (target.hasAttribute('download')) {
        return;
      }

      const href = target.href;
      const opensOutside = target.target === '_blank' || shouldOpenExternalUrl(href);
      if (!opensOutside) {
        return;
      }

      event.preventDefault();
      const browser = getCapacitorBrowserPlugin();
      if (!browser) {
        return;
      }

      void browser.open({ url: href });
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      window.open = originalOpen;
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled]);
}

function useNativeChrome(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const statusBar = getCapacitorStatusBarPlugin();
    const keyboard = getCapacitorKeyboardPlugin();

    void statusBar?.setStyle({ style: CAPACITOR_STATUS_BAR_STYLE_DARK });
    void keyboard?.setResizeMode({ mode: CAPACITOR_KEYBOARD_RESIZE_NATIVE });
    void keyboard?.setStyle({ style: CAPACITOR_KEYBOARD_STYLE_DARK });
    void keyboard?.setAccessoryBarVisible({ isVisible: false });

    if (getCapacitorPlatform() === 'ios') {
      void keyboard?.setScroll({ isDisabled: false });
    }
  }, [enabled]);
}

function useDeepLinkNavigation(enabled: boolean) {
  const navigate = useNavigate();
  const lastHandledUrlRef = useRef<string | null>(null);
  const lastClosedFingerprintRef = useRef<string | null>(null);
  const hasInitializedLaunchUrlRef = useRef(false);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.info('[mobile-auth] NativeMobileBridge mounted');

    const app = getCapacitorAppPlugin();
    if (!app) {
      return;
    }

    const handleUrl = async (url: string, source: 'launch' | 'event') => {
      if (!url) {
        return;
      }

      if (lastHandledUrlRef.current === url && source === 'event') {
        return;
      }

      lastHandledUrlRef.current = url;

      if (isNativeAuthCallbackUrl(url)) {
        const resolution = resolveMobileAuthSessionFromCallback(url);
        if (!resolution) {
          console.info('[mobile-auth] callback ignored: no resolution', { source, url });
          return;
        }

        const consumedLaunchFingerprint = getConsumedLaunchFingerprint();
        if (source === 'launch' && consumedLaunchFingerprint === resolution.fingerprint) {
          console.info('[mobile-auth] ignored already-consumed launch callback', {
            fingerprint: resolution.fingerprint,
          });
          return;
        }

        if (resolution.type === 'duplicate' && source === 'launch') {
          console.info('[mobile-auth] ignored duplicate launch callback', {
            fingerprint: resolution.fingerprint,
          });
          setConsumedLaunchFingerprint(resolution.fingerprint);
          return;
        }

        if (
          resolution.type !== 'duplicate'
          && lastClosedFingerprintRef.current !== resolution.fingerprint
        ) {
          lastClosedFingerprintRef.current = resolution.fingerprint;
          await closeCapacitorBrowser();
          scheduleCapacitorBrowserCloseRetries();
        }

        setConsumedLaunchFingerprint(resolution.fingerprint);
        const currentPath = getCurrentAppPath();
        const nextPath = resolution.type === 'session'
          ? resolveCallbackTargetPath(resolution.session.authMode, currentPath)
          : '/';

        console.info('[mobile-auth] bridge consumed callback', {
          type: resolution.type,
          source,
          nextPath,
          currentPath,
          at: Date.now(),
        });

        if (nextPath === currentPath) {
          console.info('[mobile-auth] refresh callback preserved current route', {
            nextPath,
            at: Date.now(),
          });
          return;
        }

        console.info('[mobile-auth] navigate() start', { nextPath, at: Date.now() });
        navigateRef.current(nextPath, { replace: true });
        console.info('[mobile-auth] navigate() end', { nextPath, at: Date.now() });
        return;
      }

      const nextPath = normalizeAppUrlToPath(url);
      if (nextPath) {
        navigateRef.current(nextPath, { replace: true });
      }
    };

    if (!hasInitializedLaunchUrlRef.current) {
      hasInitializedLaunchUrlRef.current = true;
      console.info('[mobile-auth] getLaunchUrl() requested');
      void app.getLaunchUrl().then((launchUrl) => {
        console.info('[mobile-auth] getLaunchUrl() resolved', { url: launchUrl?.url ?? null });
        if (launchUrl?.url) {
          void handleUrl(launchUrl.url, 'launch');
        }
      });
    }

    let listenerHandle: Awaited<ReturnType<typeof app.addListener>> | null = null;
    let localNotificationHandle:
      | Awaited<ReturnType<NonNullable<ReturnType<typeof getCapacitorLocalNotificationsPlugin>>['addListener']>>
      | null = null;

    void Promise.resolve(app.addListener('appUrlOpen', ({ url }) => {
      console.info('[mobile-auth] appUrlOpen', { url });
      void handleUrl(url, 'event');
    })).then((handle) => {
      listenerHandle = handle;
    });

    const localNotifications = getCapacitorLocalNotificationsPlugin();
    if (localNotifications) {
      void Promise.resolve(
        localNotifications.addListener('localNotificationActionPerformed', (event) => {
          const rawTarget = event.notification?.extra?.targetPath;
          const nextPath = typeof rawTarget === 'string' && rawTarget.trim().length > 0
            ? rawTarget
            : DAILY_REMINDER_NOTIFICATION_TARGET_PATH;
          console.info('[mobile-reminder] local notification action', { nextPath, at: Date.now() });
          navigateRef.current(nextPath, { replace: false });
        }),
      ).then((handle) => {
        localNotificationHandle = handle;
      });
    }

    return () => {
      console.info('[mobile-auth] NativeMobileBridge unmounted');
      void listenerHandle?.remove();
      void localNotificationHandle?.remove();
    };
  }, [enabled]);
}

export function NativeMobileBridge() {
  const enabled = isNativeCapacitorPlatform();

  useNativeDocumentClass(enabled);
  useExternalLinkBridge(enabled);
  useNativeChrome(enabled);
  useDeepLinkNavigation(enabled);

  return null;
}
