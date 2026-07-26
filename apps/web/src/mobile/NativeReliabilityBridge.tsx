import { useEffect } from 'react';
import { getDailyReminderSettings } from '../lib/api';
import {
  getCapacitorAppPlugin,
  getCapacitorPlatform,
  isNativeCapacitorPlatform,
} from './capacitor';
import { syncNativeDailyReminderNotification } from './localNotifications';
import {
  ensureFreshMobileAuthSession,
  getMobileAuthSession,
  shouldForceNativeWelcome,
} from './mobileAuthSession';
import { writeMobileDebug } from './mobileDebug';

const NATIVE_SESSION_REFRESH_WINDOW_MS = 15 * 60 * 1000;
const NATIVE_RELIABILITY_COOLDOWN_MS = 30_000;
const REMINDER_DIAGNOSTIC_BUILD = 'reminder-diagnostics-v1-2026-07-26';

let maintenancePromise: Promise<void> | null = null;
let lastMaintenanceStartedAt = 0;

export function shouldRefreshNativeSession(
  expiresAt: number | null | undefined,
  now = Date.now(),
): boolean {
  if (typeof expiresAt !== 'number') {
    return false;
  }

  return expiresAt - now <= NATIVE_SESSION_REFRESH_WINDOW_MS;
}

async function runNativeReliabilityMaintenance(reason: string): Promise<void> {
  if (!isNativeCapacitorPlatform() || shouldForceNativeWelcome()) {
    return;
  }

  const session = getMobileAuthSession();
  if (!session?.token) {
    return;
  }

  const now = Date.now();
  if (maintenancePromise) {
    return maintenancePromise;
  }

  if (now - lastMaintenanceStartedAt < NATIVE_RELIABILITY_COOLDOWN_MS) {
    return;
  }

  lastMaintenanceStartedAt = now;
  maintenancePromise = (async () => {
    writeMobileDebug('native-reliability:start', {
      reason,
      expiresAt: session.expiresAt,
      shouldRefresh: shouldRefreshNativeSession(session.expiresAt, now),
      at: now,
    });

    try {
      if (shouldRefreshNativeSession(session.expiresAt, now)) {
        await ensureFreshMobileAuthSession({
          reason: `native-reliability:${reason}`,
          minValidityMs: NATIVE_SESSION_REFRESH_WINDOW_MS,
        });
      }
    } catch (error) {
      console.warn('[native-reliability] session refresh failed without clearing local session', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      writeMobileDebug('native-reliability:session-refresh-failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
        at: Date.now(),
      });
    }

    try {
      const latestSession = getMobileAuthSession();
      if (!latestSession?.token || shouldForceNativeWelcome()) {
        return;
      }

      const reminder = await getDailyReminderSettings('notification');
      await syncNativeDailyReminderNotification(reminder);
      writeMobileDebug('native-reliability:reminder-resynced', {
        reason,
        at: Date.now(),
      });
    } catch (error) {
      console.warn('[native-reliability] reminder resync failed without cancelling the existing schedule', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      writeMobileDebug('native-reliability:reminder-resync-failed', {
        reason,
        error: error instanceof Error ? error.message : String(error),
        at: Date.now(),
      });
    }
  })().finally(() => {
    maintenancePromise = null;
  });

  return maintenancePromise;
}

function isDailyReminderForm(target: EventTarget | null): target is HTMLFormElement {
  return target instanceof HTMLFormElement
    && target.classList.contains('reminder-scheduler-form');
}

function readReminderUiOutcome(): 'success' | 'error' | null {
  const text = document.body?.innerText ?? '';
  if (text.includes('Guardamos tus recordatorios.')) {
    return 'success';
  }
  if (
    text.includes('No pudimos guardar tus recordatorios.')
    || text.includes('Necesitamos permiso para enviarte notificaciones')
  ) {
    return 'error';
  }
  return null;
}

export function NativeReliabilityBridge() {
  useEffect(() => {
    if (!isNativeCapacitorPlatform()) {
      return;
    }

    writeMobileDebug('reminder-diagnostics:build', {
      marker: REMINDER_DIAGNOSTIC_BUILD,
      platform: getCapacitorPlatform(),
      native: isNativeCapacitorPlatform(),
      path: window.location.pathname,
      at: Date.now(),
    });

    void runNativeReliabilityMaintenance('mount');

    const app = getCapacitorAppPlugin();
    let appStateHandle: Awaited<ReturnType<NonNullable<typeof app>['addListener']>> | null = null;
    let lastUiOutcome: 'success' | 'error' | null = null;

    if (app) {
      void Promise.resolve(app.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          void runNativeReliabilityMaintenance('app-active');
        }
      })).then((handle) => {
        appStateHandle = handle;
      });
    }

    const handleOnline = () => {
      void runNativeReliabilityMaintenance('online');
    };

    const handleReminderSubmit = (event: SubmitEvent) => {
      if (!isDailyReminderForm(event.target)) {
        return;
      }

      lastUiOutcome = null;
      writeMobileDebug('reminder-diagnostics:submit-captured', {
        marker: REMINDER_DIAGNOSTIC_BUILD,
        platform: getCapacitorPlatform(),
        native: isNativeCapacitorPlatform(),
        path: window.location.pathname,
        submitterTag: event.submitter instanceof HTMLElement ? event.submitter.tagName : null,
        at: Date.now(),
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      writeMobileDebug('reminder-diagnostics:window-error', {
        marker: REMINDER_DIAGNOSTIC_BUILD,
        message: event.message,
        filename: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null,
        at: Date.now(),
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      writeMobileDebug('reminder-diagnostics:unhandled-rejection', {
        marker: REMINDER_DIAGNOSTIC_BUILD,
        error: reason instanceof Error ? reason.message : String(reason),
        at: Date.now(),
      });
    };

    const outcomeObserver = new MutationObserver(() => {
      const outcome = readReminderUiOutcome();
      if (!outcome || outcome === lastUiOutcome) {
        return;
      }
      lastUiOutcome = outcome;
      writeMobileDebug(`reminder-diagnostics:ui-${outcome}`, {
        marker: REMINDER_DIAGNOSTIC_BUILD,
        platform: getCapacitorPlatform(),
        path: window.location.pathname,
        at: Date.now(),
      });
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('submit', handleReminderSubmit, true);
    outcomeObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('submit', handleReminderSubmit, true);
      outcomeObserver.disconnect();
      void appStateHandle?.remove();
    };
  }, []);

  return null;
}
