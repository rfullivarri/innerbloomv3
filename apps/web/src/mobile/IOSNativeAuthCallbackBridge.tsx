import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  INNERBLOOM2_DASHBOARD_PATH,
  INNERBLOOM2_INTRO_JOURNEY_PATH,
} from '../config/auth';
import { NATIVE_AUTH_CALLBACK_EVENT, getCapacitorPlatform } from './capacitor';
import { resolveMobileAuthSessionFromCallback } from './mobileAuthSession';
import { resolveCallbackTargetPath } from './NativeMobileBridge';

function getCurrentAppPath(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname || '/'}${search || ''}${hash || ''}`;
}

export function IOSNativeAuthCallbackBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getCapacitorPlatform() !== 'ios') {
      return;
    }

    const handleNativeAuthCallback = (event: Event) => {
      const customEvent = event as CustomEvent<{ url?: unknown }>;
      const rawUrl = customEvent.detail?.url;
      const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

      if (!url) {
        console.warn('[mobile-auth] iOS callback event ignored: missing url');
        return;
      }

      customEvent.preventDefault();

      const resolution = resolveMobileAuthSessionFromCallback(url);
      if (!resolution) {
        console.warn('[mobile-auth] iOS callback event ignored: invalid callback', { url });
        return;
      }

      const currentPath = getCurrentAppPath();
      const nextPath = resolution.type === 'session'
        ? resolveCallbackTargetPath(resolution.session, currentPath)
        : resolution.type === 'signed-out'
          ? '/'
          : INNERBLOOM2_DASHBOARD_PATH;

      const safeNextPath = nextPath === '/intro-journey2'
        ? INNERBLOOM2_INTRO_JOURNEY_PATH
        : nextPath;

      console.info('[mobile-auth] iOS callback event consumed', {
        type: resolution.type,
        currentPath,
        nextPath: safeNextPath,
        at: Date.now(),
      });

      navigate(safeNextPath, { replace: true });
    };

    window.addEventListener(NATIVE_AUTH_CALLBACK_EVENT, handleNativeAuthCallback);
    return () => {
      window.removeEventListener(NATIVE_AUTH_CALLBACK_EVENT, handleNativeAuthCallback);
    };
  }, [navigate]);

  return null;
}
