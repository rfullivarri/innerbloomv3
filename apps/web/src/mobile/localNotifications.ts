import type { DailyReminderSettingsResponse } from '../lib/api';
import { getCapacitorLocalNotificationsPlugin, isNativeCapacitorPlatform } from './capacitor';

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_TEST_NOTIFICATION_ID = 41002;
export const DAILY_REMINDER_NOTIFICATION_TARGET_PATH = '/dashboard-v3?dailyQuest=1';

type DailyReminderNotificationPermissionResult = {
  granted: boolean;
};

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
    throw new Error('Necesitamos permiso para enviarte notificaciones en este dispositivo.');
  }

  await plugin.cancel({
    notifications: [{ id: DAILY_REMINDER_TEST_NOTIFICATION_ID }],
  });

  await plugin.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
        title: 'Innerbloom',
        body: 'Prueba local: tu Daily Quest ya puede recordarte.',
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
      throw new Error('Necesitamos permiso para enviarte notificaciones en este dispositivo.');
    }
    return;
  }

  const { hour, minute, second } = normalizeLocalTimeParts(reminder?.local_time ?? reminder?.localTime ?? '09:00:00');

  await cancelNativeDailyReminderNotification();
  await plugin.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_NOTIFICATION_ID,
        title: 'Daily Quest',
        body: 'Revisa tu Daily Quest y suma GP hoy.',
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
