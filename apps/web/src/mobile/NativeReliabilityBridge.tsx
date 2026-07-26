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

export function NativeReliabilityBridge() {
  useEffect(() => {
    if (!isNativeCapacitorPlatform()) {
      return;
    }

    void runNativeReliabilityMaintenance('mount');

    const app = getCapacitorAppPlugin();
    let appStateHandle: Awaited<ReturnType<NonNullable<typeof app>['addListener']>> | null = null;

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
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      void appStateHandle?.remove();
    };
  }, []);

  return null;
}
