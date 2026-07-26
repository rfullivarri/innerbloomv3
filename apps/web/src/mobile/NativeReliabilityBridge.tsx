import { useEffect } from 'react';
import { getDailyReminderSettings } from '../lib/api';
import {
  getCapacitorAppPlugin,
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
const REMINDER_SAVE_RECONCILE_DELAYS_MS = [750, 2_500];

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

async function runNativeReliabilityMaintenance(
  reason: string,
  options?: { force?: boolean },
): Promise<void> {
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

  if (!options?.force && now - lastMaintenanceStartedAt < NATIVE_RELIABILITY_COOLDOWN_MS) {
    writeMobileDebug('native-reliability:skipped-cooldown', {
      reason,
      elapsedMs: now - lastMaintenanceStartedAt,
      at: now,
    });
    return;
  }

  lastMaintenanceStartedAt = now;
  maintenancePromise = (async () => {
    writeMobileDebug('native-reliability:start', {
      reason,
      forced: options?.force === true,
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
      await syncNativeDailyReminderNotification(reminder, {
        requestPermissions: reason.startsWith('reminder-save'),
      });
      writeMobileDebug('native-reliability:reminder-resynced', {
        reason,
        localTime: reminder?.local_time ?? reminder?.localTime ?? null,
        status: reminder?.status ?? null,
        enabled: reminder?.enabled ?? null,
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

export function NativeReliabilityBridge() {
  useEffect(() => {
    if (!isNativeCapacitorPlatform()) {
      return;
    }

    void runNativeReliabilityMaintenance('mount');

    const app = getCapacitorAppPlugin();
    let appStateHandle: Awaited<ReturnType<NonNullable<typeof app>['addListener']>> | null = null;
    const reminderSaveTimeoutIds = new Set<number>();

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

      writeMobileDebug('native-reliability:reminder-save-detected', {
        at: Date.now(),
      });

      for (const [index, delayMs] of REMINDER_SAVE_RECONCILE_DELAYS_MS.entries()) {
        const timeoutId = window.setTimeout(() => {
          reminderSaveTimeoutIds.delete(timeoutId);
          void runNativeReliabilityMaintenance(`reminder-save-${index + 1}`, {
            force: true,
          });
        }, delayMs);
        reminderSaveTimeoutIds.add(timeoutId);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('submit', handleReminderSubmit, true);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('submit', handleReminderSubmit, true);
      for (const timeoutId of reminderSaveTimeoutIds) {
        window.clearTimeout(timeoutId);
      }
      reminderSaveTimeoutIds.clear();
      void appStateHandle?.remove();
    };
  }, []);

  return null;
}
