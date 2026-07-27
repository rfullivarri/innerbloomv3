import type { DailyReminderSettingsResponse } from '../lib/api';
import { resolvePostLoginTranslation } from '../i18n/post-login';
import { type PostLoginLanguage, POSTLOGIN_LANGUAGE_STORAGE_KEY, detectDeviceLanguage } from '../i18n/postLoginLanguage';
import { AUTH_LANGUAGE_STORAGE_KEY } from '../lib/authLanguage';
import { INNERBLOOM2_DAILY_QUEST_PATH } from '../config/auth';
import {
  consumeNativeLogoutReminderPreservation,
  getCapacitorLocalNotificationsPlugin,
  getCapacitorPlatform,
  isNativeCapacitorPlatform,
} from './capacitor';
import { writeMobileDebug } from './mobileDebug';

const DAILY_REMINDER_NOTIFICATION_CHANNEL_ID = 'daily-quest-reminders';
const DEFAULT_NOTIFICATION_SOUND = 'default';

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_TEST_NOTIFICATION_ID = 41999;
export const DAILY_REMINDER_NOTIFICATION_TARGET_PATH = INNERBLOOM2_DAILY_QUEST_PATH;

type DailyReminderNotificationPermissionResult = {
  granted: boolean;
  exactAlarm?: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | null;
};

const ONBOARDING_LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';
let isReminderSyncInProgress = false;

function withDefaultSound<T extends Record<string, unknown>>(notification: T): T & { sound: string } {
  return { ...notification, sound: DEFAULT_NOTIFICATION_SOUND };
}

function normalizeLanguage(raw: string | null | undefined): PostLoginLanguage | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('en')) return 'en';
  return null;
}

function resolveNotificationLanguage(): PostLoginLanguage {
  if (typeof window === 'undefined') return 'en';
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
  const nextPayload = { ...payload, at: Date.now() };
  console.info(`[mobile-reminder] ${event}`, nextPayload);
  writeMobileDebug(`mobile-reminder:${event}`, nextPayload);
}

function normalizeLocalTimeParts(value?: string | null): { hour: number; minute: number; second: number } {
  const [rawHour = '9', rawMinute = '0', rawSecond = '0'] = (value ?? '09:00:00').split(':');
  return {
    hour: Math.min(23, Math.max(0, Number.parseInt(rawHour, 10) || 0)),
    minute: Math.min(59, Math.max(0, Number.parseInt(rawMinute, 10) || 0)),
    second: Math.min(59, Math.max(0, Number.parseInt(rawSecond, 10) || 0)),
  };
}

function isReminderEnabled(reminder: DailyReminderSettingsResponse | null | undefined): boolean {
  if (!reminder) return false;
  if (typeof reminder.enabled === 'boolean') return reminder.enabled;
  return reminder.status === 'active';
}

async function readAndroidExactAlarmPermission(
  requestExactAlarm: boolean,
): Promise<DailyReminderNotificationPermissionResult['exactAlarm']> {
  if (getCapacitorPlatform() !== 'android') return null;

  const plugin = getCapacitorLocalNotificationsPlugin();
  const exactAlarm = await plugin?.checkExactNotificationSetting?.().catch((error) => {
    logNativeReminder('permission-exact-alarm-check-failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  if (!exactAlarm) return null;

  logNativeReminder('permission-exact-alarm-check', { exactAlarm: exactAlarm.exact_alarm });
  if (!requestExactAlarm || exactAlarm.exact_alarm === 'granted') return exactAlarm.exact_alarm;

  const changed = await plugin?.changeExactNotificationSetting?.().catch((error) => {
    logNativeReminder('permission-exact-alarm-change-failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  });
  logNativeReminder('permission-exact-alarm-change', { exactAlarm: changed?.exact_alarm ?? null });
  return changed?.exact_alarm ?? exactAlarm.exact_alarm;
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
  const permission = existing.display === 'granted' ? existing : await plugin.requestPermissions();
  if (existing.display !== 'granted') {
    logNativeReminder('permission-request', { display: permission.display });
  }
  if (permission.display !== 'granted') {
    return { granted: false, exactAlarm: null };
  }

  return {
    granted: true,
    exactAlarm: await readAndroidExactAlarmPermission(options?.requestExactAlarm === true),
  };
}

async function performNativeDailyReminderCancellation(): Promise<void> {
  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) {
    logNativeReminder('cancel-plugin-missing');
    return;
  }
  const notifications = [{ id: DAILY_REMINDER_NOTIFICATION_ID }];
  await plugin.cancel({ notifications });
  logNativeReminder('cancel-scheduled', { ids: [DAILY_REMINDER_NOTIFICATION_ID] });
}

export async function cancelNativeDailyReminderNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) return;

  if (isReminderSyncInProgress || typeof window === 'undefined') {
    await performNativeDailyReminderCancellation();
    return;
  }

  logNativeReminder('cancel-deferred-for-lifecycle-check');
  window.setTimeout(() => {
    if (consumeNativeLogoutReminderPreservation()) {
      logNativeReminder('cancel-skipped-for-logout');
      return;
    }
    void performNativeDailyReminderCancellation().catch((error) => {
      logNativeReminder('cancel-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, 0);
}

async function ensureAndroidReminderChannel(): Promise<void> {
  if (getCapacitorPlatform() !== 'android') return;
  const plugin = getCapacitorLocalNotificationsPlugin();
  await plugin?.createChannel?.({
    id: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
    name: 'Daily Quest reminders',
    description: 'Daily reminders to open your Daily Quest.',
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  });
  logNativeReminder('channel-ready', {
    channelId: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
    vibration: true,
    importance: 4,
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
    throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
  }

  await ensureAndroidReminderChannel();
  await plugin.cancel({ notifications: [{ id: DAILY_REMINDER_TEST_NOTIFICATION_ID }] });
  await plugin.schedule({
    notifications: [withDefaultSound({
      id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
      title: tNotification('dailyQuest.mobile.testNotification.title'),
      body: tNotification('dailyQuest.mobile.testNotification.body'),
      channelId: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
      schedule: {
        at: new Date(Date.now() + 10_000),
        allowWhileIdle: true,
      },
      extra: {
        targetPath: DAILY_REMINDER_NOTIFICATION_TARGET_PATH,
        kind: 'daily-reminder-test',
      },
    })],
  });

  const pending = await plugin.getPending?.().catch(() => null);
  logNativeReminder('test-scheduled', {
    id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
    sound: DEFAULT_NOTIFICATION_SOUND,
    vibration: getCapacitorPlatform() === 'android',
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

  isReminderSyncInProgress = true;
  try {
    if (!isReminderEnabled(reminder)) {
      logNativeReminder('sync-reminder-disabled', {
        status: reminder?.status ?? null,
        enabled: reminder?.enabled ?? null,
      });
      await performNativeDailyReminderCancellation();
      return;
    }

    const existingPermission = await plugin.checkPermissions();
    const shouldRequestPermission =
      options?.requestPermissions === true ||
      existingPermission.display === 'prompt' ||
      existingPermission.display === 'prompt-with-rationale';
    const permissions = shouldRequestPermission
      ? await ensureNativeDailyReminderNotificationPermissions({ requestExactAlarm: true })
      : { granted: existingPermission.display === 'granted' };

    if (!permissions.granted) {
      logNativeReminder('sync-permission-unavailable', {
        display: existingPermission.display,
        requestPermissions: shouldRequestPermission,
      });
      if (options?.requestPermissions || shouldRequestPermission) {
        throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
      }
      return;
    }

    const { hour, minute, second } = normalizeLocalTimeParts(
      reminder?.local_time ?? reminder?.localTime ?? '09:00:00',
    );

    await ensureAndroidReminderChannel();

    logNativeReminder('sync-replace-start', {
      id: DAILY_REMINDER_NOTIFICATION_ID,
      hour,
      minute,
      second,
      platform: getCapacitorPlatform(),
      sound: DEFAULT_NOTIFICATION_SOUND,
      vibration: getCapacitorPlatform() === 'android',
    });

    await plugin.cancel({ notifications: [{ id: DAILY_REMINDER_NOTIFICATION_ID }] });
    logNativeReminder('sync-previous-cancelled', { id: DAILY_REMINDER_NOTIFICATION_ID });

    await plugin.schedule({
      notifications: [withDefaultSound({
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
      })],
    });

    const pending = await plugin.getPending?.().catch((error) => {
      logNativeReminder('sync-pending-check-failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    });
    const pendingIds = pending?.notifications?.map((notification) => notification.id).filter(Boolean) ?? null;
    const confirmed = pendingIds?.includes(DAILY_REMINDER_NOTIFICATION_ID) ?? false;
    logNativeReminder('sync-scheduled', {
      id: DAILY_REMINDER_NOTIFICATION_ID,
      hour,
      minute,
      second,
      sound: DEFAULT_NOTIFICATION_SOUND,
      pendingIds,
      confirmed,
    });
    if (pending && !confirmed) {
      throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
    }
  } finally {
    isReminderSyncInProgress = false;
  }
}
