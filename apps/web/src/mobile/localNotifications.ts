import type { DailyReminderSettingsResponse } from '../lib/api';
import { resolvePostLoginTranslation } from '../i18n/post-login';
import { type PostLoginLanguage, POSTLOGIN_LANGUAGE_STORAGE_KEY, detectDeviceLanguage } from '../i18n/postLoginLanguage';
import { AUTH_LANGUAGE_STORAGE_KEY } from '../lib/authLanguage';
import { getCapacitorLocalNotificationsPlugin, isNativeCapacitorPlatform } from './capacitor';
import { writeMobileDebug } from './mobileDebug';

const DAILY_REMINDER_NOTIFICATION_CHANNEL_ID = 'daily-quest-reminders';

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_TEST_NOTIFICATION_ID = 41999;
export const DAILY_REMINDER_NOTIFICATION_TARGET_PATH = '/dashboard-v3?dailyQuest=1';

type DailyReminderNotificationPermissionResult = {
  granted: boolean;
  exactAlarm?: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | null;
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

function logNativeReminder(event: string, payload: Record<string, unknown> = {}): void {
  const nextPayload = {
    ...payload,
    at: Date.now(),
  };
  console.info(`[mobile-reminder] ${event}`, nextPayload);
  writeMobileDebug(`mobile-reminder:${event}`, nextPayload);
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

export async function ensureNativeDailyReminderNotificationPermissions(options?: {
  requestExactAlarm?: boolean;
}): Promise<DailyReminderNotificationPermissionResult> {
  if (!isNativeCapacitorPlatform()) {
    logNativeReminder('permission-skip-not-native');
    return { granted: false };
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    logNativeReminder('permission-plugin-missing');
    return { granted: false };
  }

  const existing = await plugin.checkPermissions();
  logNativeReminder('permission-check', { display: existing.display });
  if (existing.display === 'granted') {
    const exactAlarm = await plugin.checkExactNotificationSetting?.().catch((error) => {
      logNativeReminder('permission-exact-alarm-check-failed', { error: error instanceof Error ? error.message : String(error) });
      return null;
    });
    if (exactAlarm) {
      logNativeReminder('permission-exact-alarm-check', { exactAlarm: exactAlarm.exact_alarm });
      if (options?.requestExactAlarm && exactAlarm.exact_alarm !== 'granted') {
        const changed = await plugin.changeExactNotificationSetting?.().catch((error) => {
          logNativeReminder('permission-exact-alarm-change-failed', { error: error instanceof Error ? error.message : String(error) });
          return null;
        });
        logNativeReminder('permission-exact-alarm-change', { exactAlarm: changed?.exact_alarm ?? null });
        return { granted: true, exactAlarm: changed?.exact_alarm ?? exactAlarm.exact_alarm };
      }
      return { granted: true, exactAlarm: exactAlarm.exact_alarm };
    }

    return { granted: true, exactAlarm: null };
  }

  const requested = await plugin.requestPermissions();
  logNativeReminder('permission-request', { display: requested.display });
  if (requested.display !== 'granted') {
    return { granted: false, exactAlarm: null };
  }

  const exactAlarm = await plugin.checkExactNotificationSetting?.().catch((error) => {
    logNativeReminder('permission-exact-alarm-check-failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  if (exactAlarm) {
    logNativeReminder('permission-exact-alarm-check', { exactAlarm: exactAlarm.exact_alarm });
    if (options?.requestExactAlarm && exactAlarm.exact_alarm !== 'granted') {
      const changed = await plugin.changeExactNotificationSetting?.().catch((error) => {
        logNativeReminder('permission-exact-alarm-change-failed', { error: error instanceof Error ? error.message : String(error) });
        return null;
      });
      logNativeReminder('permission-exact-alarm-change', { exactAlarm: changed?.exact_alarm ?? null });
      return { granted: true, exactAlarm: changed?.exact_alarm ?? exactAlarm.exact_alarm };
    }
    return { granted: true, exactAlarm: exactAlarm.exact_alarm };
  }

  return { granted: true, exactAlarm: null };
}

export async function cancelNativeDailyReminderNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    logNativeReminder('cancel-plugin-missing');
    return;
  }

  const notifications = [{ id: DAILY_REMINDER_NOTIFICATION_ID }];
  await plugin.cancel({ notifications });
  logNativeReminder('cancel-scheduled', {
    ids: notifications.map((notification) => notification.id),
  });
}

export async function sendNativeDailyReminderTestNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    logNativeReminder('test-skip-not-native');
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    logNativeReminder('test-plugin-missing');
    return;
  }

  logNativeReminder('test-start');
  const permissions = await ensureNativeDailyReminderNotificationPermissions();
  if (!permissions.granted) {
    logNativeReminder('test-permission-denied');
    throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
  }

  const exactAlarm = await plugin.checkExactNotificationSetting?.().catch((error) => {
    logNativeReminder('test-exact-alarm-check-failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  if (exactAlarm) {
    logNativeReminder('test-exact-alarm-check', { exactAlarm: exactAlarm.exact_alarm });
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
  const pending = await plugin.getPending?.().catch((error) => {
    logNativeReminder('test-pending-check-failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  logNativeReminder('test-scheduled', {
    id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
    pendingCount: pending?.notifications?.length ?? null,
    pendingIds: pending?.notifications?.map((notification) => notification.id).filter(Boolean) ?? null,
  });
}

export async function syncNativeDailyReminderNotification(
  reminder: DailyReminderSettingsResponse | null | undefined,
  options?: { requestPermissions?: boolean },
): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    logNativeReminder('sync-skip-not-native');
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    logNativeReminder('sync-plugin-missing');
    return;
  }

  if (!isReminderEnabled(reminder)) {
    logNativeReminder('sync-reminder-disabled', {
      status: reminder?.status ?? null,
      enabled: reminder?.enabled ?? null,
    });
    await cancelNativeDailyReminderNotification();
    return;
  }

  const permissions = options?.requestPermissions
    ? await ensureNativeDailyReminderNotificationPermissions()
    : await plugin.checkPermissions().then((result) => ({ granted: result.display === 'granted' }));

  if (!permissions.granted) {
    logNativeReminder('sync-permission-denied', { requestPermissions: options?.requestPermissions === true });
    await cancelNativeDailyReminderNotification();
    if (options?.requestPermissions) {
      throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
    }
    return;
  }

  const { hour, minute, second } = normalizeLocalTimeParts(reminder?.local_time ?? reminder?.localTime ?? '09:00:00');
  const exactAlarm = await plugin.checkExactNotificationSetting?.().catch((error) => {
    logNativeReminder('sync-exact-alarm-check-failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  if (exactAlarm) {
    logNativeReminder('sync-exact-alarm-check', { exactAlarm: exactAlarm.exact_alarm });
  }
  await plugin.createChannel?.({
    id: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
    name: 'Daily Quest reminders',
    description: 'Daily reminders to open your Daily Quest.',
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  }).catch((error) => {
    logNativeReminder('sync-channel-create-failed', { error: error instanceof Error ? error.message : String(error) });
  });

  logNativeReminder('sync-schedule-start', {
    id: DAILY_REMINDER_NOTIFICATION_ID,
    hour,
    minute,
    second,
    status: reminder?.status ?? null,
    enabled: reminder?.enabled ?? null,
    channel: reminder?.channel ?? null,
  });

  await cancelNativeDailyReminderNotification();
  await plugin.schedule({
    notifications: [
      {
        id: DAILY_REMINDER_NOTIFICATION_ID,
        title: tNotification('dailyQuest.mobile.notification.title'),
        body: tNotification('dailyQuest.mobile.notification.body'),
        channelId: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
        smallIcon: 'ic_stat_innerbloom',
        iconColor: '#A855F7',
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
  const pending = await plugin.getPending?.().catch((error) => {
    logNativeReminder('sync-pending-check-failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  });
  logNativeReminder('sync-scheduled', {
    id: DAILY_REMINDER_NOTIFICATION_ID,
    pendingCount: pending?.notifications?.length ?? null,
    pendingIds: pending?.notifications?.map((notification) => notification.id).filter(Boolean) ?? null,
  });
}
