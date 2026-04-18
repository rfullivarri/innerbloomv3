import type { DailyReminderSettingsResponse } from '../lib/api';
import { resolvePostLoginTranslation } from '../i18n/post-login';
import { type PostLoginLanguage, POSTLOGIN_LANGUAGE_STORAGE_KEY, detectDeviceLanguage } from '../i18n/postLoginLanguage';
import { AUTH_LANGUAGE_STORAGE_KEY } from '../lib/authLanguage';
import { getCapacitorLocalNotificationsPlugin, isNativeCapacitorPlatform } from './capacitor';

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_TEST_NOTIFICATION_ID = 41002;
export const DAILY_REMINDER_NOTIFICATION_TARGET_PATH = '/dashboard-v3?dailyQuest=1';

type DailyReminderNotificationPermissionResult = {
  granted: boolean;
};

const ONBOARDING_LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';

function normalizeLanguage(raw: string | null | undefined): PostLoginLanguage | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith('es')) {
    return 'es';
  }
  if (normalized.startsWith('en')) {
    return 'en';
  }
  return null;
}

function resolveNotificationLanguage(): PostLoginLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return (
    normalizeLanguage(window.localStorage.getItem(POSTLOGIN_LANGUAGE_STORAGE_KEY)) ??
    normalizeLanguage(window.localStorage.getItem(AUTH_LANGUAGE_STORAGE_KEY)) ??
    normalizeLanguage(window.localStorage.getItem(ONBOARDING_LANGUAGE_STORAGE_KEY)) ??
    detectDeviceLanguage()
  );
}

function tNotification(key: string): string {
  return resolvePostLoginTranslation(resolveNotificationLanguage(), key);
}

function normalizeLocalTimeParts(value?: string | null): { hour: number; minute: number; second: number } {
  const [rawHour = '9', rawMinute = '0', rawSecond = '0'] = (value ?? '09:00:00').split(':');
  const hour = Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0));
  const minute = Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0));
  const second = Math.min(59, Math.max(0, Number.parseInt(rawSecond, 10) || 0));

  return { hour, minute, second };
}

function isReminderEnabled(reminder: DailyReminderSettingsResponse | null | undefined): boolean {
  if (!reminder) {
    return false;
  }

  if (typeof reminder.enabled === 'boolean') {
    return reminder.enabled;
  }

  return reminder.status === 'active';
}

export async function ensureNativeDailyReminderNotificationPermissions(): Promise<DailyReminderNotificationPermissionResult> {
  if (!isNativeCapacitorPlatform()) {
    return { granted: false };
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    return { granted: false };
  }

  const existing = await plugin.checkPermissions();
  if (existing.display === 'granted') {
    return { granted: true };
  }

  const requested = await plugin.requestPermissions();
  return { granted: requested.display === 'granted' };
}

export async function cancelNativeDailyReminderNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    return;
  }

  await plugin.cancel({
    notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }],
  });
}

export async function sendNativeDailyReminderTestNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    return;
  }

  const permissions = await ensureNativeDailyReminderNotificationPermissions();
  if (!permissions.granted) {
    throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
  }

  await plugin.cancel({
    notifications: [{ id: DAILY_REMINDER_TEST_NOTIFICATION_ID }],
  });

  await plugin.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
        title: tNotification('dailyQuest.mobile.testNotification.title'),
        body: tNotification('dailyQuest.mobile.testNotification.body'),
        schedule: {
          at: new Date(Date.now() + 10_000),
          allowWhileIdle: true,
        },
        extra: {
          targetPath: DAILY_REMINDER_NOTIFICATION_TARGET_PATH,
          kind: 'daily-reminder-test',
        },
      },
    ],
  });
}

export async function syncNativeDailyReminderNotification(
  reminder: DailyReminderSettingsResponse | null | undefined,
  options?: { requestPermissions?: boolean },
): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    return;
  }

  if (!isReminderEnabled(reminder)) {
    await cancelNativeDailyReminderNotification();
    return;
  }

  const permissions = options?.requestPermissions
    ? await ensureNativeDailyReminderNotificationPermissions()
    : await plugin.checkPermissions().then((result) => ({ granted: result.display === 'granted' }));

  if (!permissions.granted) {
    await cancelNativeDailyReminderNotification();
    if (options?.requestPermissions) {
      throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
    }
    return;
  }

  const { hour, minute, second } = normalizeLocalTimeParts(reminder?.local_time ?? reminder?.localTime ?? '09:00:00');

  await cancelNativeDailyReminderNotification();
  await plugin.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_NOTIFICATION_ID,
        title: tNotification('dailyQuest.mobile.notification.title'),
        body: tNotification('dailyQuest.mobile.notification.body'),
        schedule: {
          on: { hour, minute, second },
          allowWhileIdle: true,
        },
        extra: {
          targetPath: DAILY_REMINDER_NOTIFICATION_TARGET_PATH,
          kind: 'daily-reminder',
        },
      },
    ],
  });
}
