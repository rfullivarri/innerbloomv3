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
const MOBILE_AUTH_PENDING_CALLBACK_URL_KEY = 'innerbloom.mobile.auth.pending-callback-url.v1';

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

function getPendingCallbackUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(MOBILE_AUTH_PENDING_CALLBACK_URL_KEY);
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : null;
}

function setPendingCallbackUrl(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(MOBILE_AUTH_PENDING_CALLBACK_URL_KEY, url);
}

function clearPendingCallbackUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(MOBILE_AUTH_PENDING_CALLBACK_URL_KEY);
}

function getCurrentAppPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  const { pathname, search, hash } = window.location;
  return `${pathname || '/'}${search || ''}${hash || ''}`;
}

function coerceIncomingUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value && typeof value === 'object') {
    const candidate = (value as { url?: unknown }).url;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (candidate instanceof URL) {
      return candidate.toString();
    }

    if (candidate != null) {
      const fallback = String(candidate).trim();
      if (fallback.length > 0 && fallback !== '[object Object]') {
        return fallback;
      }
    }

    const nestedCandidate = (value as { detail?: { url?: unknown } }).detail?.url;
    if (typeof nestedCandidate === 'string') {
      const trimmed = nestedCandidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }

  return null;
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
    const ignoreUnsupportedPluginCall = (label: string) => (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (/not implemented/i.test(message)) {
        console.info(`[mobile-native] ${label} skipped`, { message });
        return;
      }

      console.warn(`[mobile-native] ${label} failed`, { error });
    };

    void statusBar?.setStyle({ style: CAPACITOR_STATUS_BAR_STYLE_DARK })
      .catch(ignoreUnsupportedPluginCall('StatusBar.setStyle'));
    void keyboard?.setResizeMode({ mode: CAPACITOR_KEYBOARD_RESIZE_NATIVE })
      .catch(ignoreUnsupportedPluginCall('Keyboard.setResizeMode'));
    void keyboard?.setStyle({ style: CAPACITOR_KEYBOARD_STYLE_DARK })
      .catch(ignoreUnsupportedPluginCall('Keyboard.setStyle'));
    void keyboard?.setAccessoryBarVisible({ isVisible: false })
      .catch(ignoreUnsupportedPluginCall('Keyboard.setAccessoryBarVisible'));

    if (getCapacitorPlatform() === 'ios') {
      void keyboard?.setScroll({ isDisabled: false })
        .catch(ignoreUnsupportedPluginCall('Keyboard.setScroll'));
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

    const handleUrl = async (incomingUrl: unknown, source: 'launch' | 'event' | 'pending') => {
      try {
        const url = coerceIncomingUrl(incomingUrl);
        console.info(`[mobile-auth] handleUrl source=${source} url=${url ?? 'null'}`);

        if (!url) {
          console.warn('[mobile-auth] callback ignored: invalid url payload', {
            source,
            payloadType: typeof incomingUrl,
          });
          return;
        }

        if (isNativeAuthCallbackUrl(url)) {
          setPendingCallbackUrl(url);
          console.info(`[mobile-auth] pending callback stored source=${source} url=${url}`);
        }

        if (lastHandledUrlRef.current === url && source === 'event') {
          console.info(`[mobile-auth] duplicate event url ignored url=${url}`);
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
            clearPendingCallbackUrl();
            return;
          }

          if (
            resolution.type !== 'duplicate'
            && lastClosedFingerprintRef.current !== resolution.fingerprint
          ) {
            lastClosedFingerprintRef.current = resolution.fingerprint;
            void closeCapacitorBrowser().catch((error) => {
              console.warn('[mobile-auth] Browser.close() best-effort failed', { error });
            });
            scheduleCapacitorBrowserCloseRetries();
          }

          setConsumedLaunchFingerprint(resolution.fingerprint);
          clearPendingCallbackUrl();
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
      } catch (error) {
        console.error('[mobile-auth] handleUrl failed', {
          source,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    const pendingCallbackUrl = getPendingCallbackUrl();
    if (pendingCallbackUrl) {
      console.info(`[mobile-auth] pending callback detected on mount url=${pendingCallbackUrl}`);
      void handleUrl(pendingCallbackUrl, 'pending');
    }

    if (!hasInitializedLaunchUrlRef.current) {
      hasInitializedLaunchUrlRef.current = true;
      console.info('[mobile-auth] getLaunchUrl() requested');
      void app.getLaunchUrl().then((launchUrl) => {
        const resolvedUrl = coerceIncomingUrl(launchUrl?.url ?? launchUrl ?? null);
        console.info(`[mobile-auth] getLaunchUrl() resolved url=${resolvedUrl ?? 'null'}`);
        if (resolvedUrl) {
          void handleUrl(resolvedUrl, 'launch');
        }
      });
    }

    let listenerHandle: Awaited<ReturnType<typeof app.addListener>> | null = null;
    let localNotificationHandle:
      | Awaited<ReturnType<NonNullable<ReturnType<typeof getCapacitorLocalNotificationsPlugin>>['addListener']>>
      | null = null;

    void Promise.resolve(app.addListener('appUrlOpen', (event) => {
      const resolvedUrl = coerceIncomingUrl((event as { url?: unknown })?.url ?? event);
      console.info(`[mobile-auth] appUrlOpen url=${resolvedUrl ?? 'null'}`);
      void handleUrl(resolvedUrl, 'event');
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
