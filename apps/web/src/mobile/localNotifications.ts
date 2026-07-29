import type { DailyReminderSettingsResponse, ProductNotificationPreferences, RewardsHistorySummary } from '../lib/api';
import { resolvePostLoginTranslation } from '../i18n/post-login';
import { type PostLoginLanguage, POSTLOGIN_LANGUAGE_STORAGE_KEY, detectDeviceLanguage } from '../i18n/postLoginLanguage';
import { AUTH_LANGUAGE_STORAGE_KEY } from '../lib/authLanguage';
import { INNERBLOOM2_ACHIEVEMENTS_PATH, INNERBLOOM2_DAILY_QUEST_PATH } from '../config/auth';
import {
  consumeNativeLogoutReminderPreservation,
  getInnerbloomNotificationsPlugin,
  getCapacitorLocalNotificationsPlugin,
  getCapacitorPlatform,
  isNativeCapacitorPlatform,
} from './capacitor';
import { writeMobileDebug } from './mobileDebug';

const DAILY_REMINDER_NOTIFICATION_CHANNEL_ID = 'daily-quest-reminders';
const DEFAULT_NOTIFICATION_SOUND = 'default';
const IOS_INTERRUPTION_LEVEL = 'timeSensitive';
const USER_SAVE_LIFECYCLE_PROTECTION_MS = 90_000;

export const DAILY_REMINDER_NOTIFICATION_ID = 41001;
export const DAILY_REMINDER_TEST_NOTIFICATION_ID = 41999;
export const DAILY_REMINDER_NOTIFICATION_TARGET_PATH = INNERBLOOM2_DAILY_QUEST_PATH;
const DAILY_REMINDER_SCHEDULED_DAYS = 30;
const PRODUCT_NOTIFICATION_ID = 42001;
const PRODUCT_NOTIFICATION_COUNT = 8;
const PRODUCT_WEEKLY_NOTIFICATION_COUNT = 5;
const PRODUCT_NOTIFICATION_CHANNEL_ID = 'innerbloom-updates';

export type ProductNotificationKind = 'weekly-wrapped' | 'growth-calibration' | 'monthly-wrapped' | 'habit-achievement';

export type ProductNotificationSchedule = {
  id: number;
  kind: ProductNotificationKind;
  title: string;
  body: string;
  at: Date;
};

type DailyReminderNotificationPermissionResult = {
  granted: boolean;
  exactAlarm?: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied' | null;
};

type ReminderSyncSource = 'user-save' | 'lifecycle';

type ReminderSyncOptions = {
  requestPermissions?: boolean;
  source?: ReminderSyncSource;
};

const ONBOARDING_LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';
let isReminderSyncInProgress = false;
let isUserSaveSyncInProgress = false;
let lastUserSaveSyncStartedAt = 0;
let reminderOperationQueue: Promise<void> = Promise.resolve();

function withNativeDeliveryOptions<T extends Record<string, unknown>>(
  notification: T,
): T & { sound: string; interruptionLevel?: string; relevanceScore?: number } {
  if (getCapacitorPlatform() === 'ios') {
    return {
      ...notification,
      sound: DEFAULT_NOTIFICATION_SOUND,
      interruptionLevel: IOS_INTERRUPTION_LEVEL,
      relevanceScore: 1,
    };
  }

  return { ...notification, sound: DEFAULT_NOTIFICATION_SOUND };
}

async function scheduleNativeNotifications(
  notifications: Array<{
    id: number;
    title: string;
    body: string;
    badge?: number;
    channelId?: string;
    smallIcon?: string;
    iconColor?: string;
    sound?: string;
    interruptionLevel?: string;
    relevanceScore?: number;
    schedule: { at: Date; allowWhileIdle?: boolean };
    extra?: Record<string, unknown>;
  }>,
): Promise<void> {
  const iosNotifications = getInnerbloomNotificationsPlugin();
  if (iosNotifications) {
    await iosNotifications.schedule({ notifications });
    return;
  }

  const plugin = getCapacitorLocalNotificationsPlugin();
  await plugin?.schedule({ notifications });
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

export function buildDailyReminderSchedule(
  localTime: string | null | undefined,
  now = new Date(),
  days = DAILY_REMINDER_SCHEDULED_DAYS,
): Array<{ id: number; at: Date }> {
  const { hour, minute, second } = normalizeLocalTimeParts(localTime);
  const first = new Date(now);
  first.setHours(hour, minute, second, 0);
  if (first.getTime() <= now.getTime()) {
    first.setDate(first.getDate() + 1);
  }

  return Array.from({ length: days }, (_, index) => {
    const at = new Date(first);
    at.setDate(first.getDate() + index);
    return { id: DAILY_REMINDER_NOTIFICATION_ID + index, at };
  });
}

function dailyReminderNotificationIds(): Array<{ id: number }> {
  return Array.from(
    { length: DAILY_REMINDER_SCHEDULED_DAYS },
    (_, index) => ({ id: DAILY_REMINDER_NOTIFICATION_ID + index }),
  );
}

function productNotificationIds(): Array<{ id: number }> {
  return Array.from({ length: PRODUCT_NOTIFICATION_COUNT }, (_, index) => ({ id: PRODUCT_NOTIFICATION_ID + index }));
}

function atLocalTime(reference: Date, hour: number, minute = 0): Date {
  const next = new Date(reference);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function nextMondayMorning(now: Date): Date {
  const next = atLocalTime(now, 9);
  const daysUntilMonday = (8 - now.getDay()) % 7;
  next.setDate(next.getDate() + daysUntilMonday);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  return next;
}

function upcomingMondayMornings(now: Date): Date[] {
  const first = nextMondayMorning(now);
  return Array.from({ length: PRODUCT_WEEKLY_NOTIFICATION_COUNT }, (_, index) => {
    const at = new Date(first);
    at.setDate(first.getDate() + (index * 7));
    return at;
  });
}

function nextMonthMorning(now: Date): Date {
  const next = atLocalTime(now, 9);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function buildProductNotificationSchedule(
  preferences: ProductNotificationPreferences,
  rewards: Pick<RewardsHistorySummary, 'growthCalibration' | 'habitAchievements'>,
  now = new Date(),
): ProductNotificationSchedule[] {
  const schedule: ProductNotificationSchedule[] = [];

  if (preferences.weeklyWrappedEnabled) {
    schedule.push(...upcomingMondayMornings(now).map((at, index) => ({
      id: PRODUCT_NOTIFICATION_ID + index,
      kind: 'weekly-wrapped' as const,
      title: 'Weekly Wrapped',
      body: 'Your week is ready. Complete your Daily Quest and review your progress.',
      at,
    })));
  }

  if (preferences.growthCalibrationEnabled) {
    const at = atLocalTime(now, 9);
    at.setDate(at.getDate() + Math.max(0, rewards.growthCalibration.countdownDays));
    if (at.getTime() <= now.getTime()) at.setTime(now.getTime() + 60_000);
    schedule.push({
      id: PRODUCT_NOTIFICATION_ID + PRODUCT_WEEKLY_NOTIFICATION_COUNT,
      kind: 'growth-calibration',
      title: 'Growth Calibration',
      body: 'Your monthly calibration is ready. Review your habit adjustments.',
      at,
    });
  }

  if (preferences.monthlyWrappedEnabled) {
    schedule.push({
      id: PRODUCT_NOTIFICATION_ID + PRODUCT_WEEKLY_NOTIFICATION_COUNT + 1,
      kind: 'monthly-wrapped',
      title: 'Monthly Wrapped',
      body: 'Your month is ready to review. See the progress you built.',
      at: nextMonthMorning(now),
    });
  }

  if (preferences.habitAchievementEnabled && rewards.habitAchievements.pendingCount > 0) {
    const at = atLocalTime(now, 18);
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    schedule.push({
      id: PRODUCT_NOTIFICATION_ID + PRODUCT_WEEKLY_NOTIFICATION_COUNT + 2,
      kind: 'habit-achievement',
      title: 'Habit achievement',
      body: 'You have a habit achievement ready to review.',
      at,
    });
  }

  return schedule;
}

function isReminderEnabled(reminder: DailyReminderSettingsResponse | null | undefined): boolean {
  if (!reminder) return false;
  if (typeof reminder.enabled === 'boolean') return reminder.enabled;
  return reminder.status === 'active';
}

function enqueueReminderOperation(operation: () => Promise<void>): Promise<void> {
  const next = reminderOperationQueue.then(operation, operation);
  reminderOperationQueue = next.catch(() => undefined);
  return next;
}

function isLifecycleSyncProtected(now = Date.now()): boolean {
  return isUserSaveSyncInProgress || now - lastUserSaveSyncStartedAt < USER_SAVE_LIFECYCLE_PROTECTION_MS;
}

function describePendingReminder(
  notifications: Array<Record<string, unknown>> | null | undefined,
  id: number,
): Record<string, unknown> | null {
  const matching = notifications?.find((notification) => notification.id === id);
  if (!matching) return null;

  const schedule = matching.schedule;
  return {
    id: matching.id ?? null,
    title: matching.title ?? null,
    schedule: typeof schedule === 'object' && schedule !== null ? schedule : null,
    extra: typeof matching.extra === 'object' && matching.extra !== null ? matching.extra : null,
  };
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
  const notifications = dailyReminderNotificationIds();
  await plugin.cancel({ notifications });
  logNativeReminder('cancel-scheduled', { ids: notifications.map(({ id }) => id) });
}

export async function cancelNativeDailyReminderNotification(): Promise<void> {
  if (!isNativeCapacitorPlatform()) return;

  if (isReminderSyncInProgress || typeof window === 'undefined') {
    await enqueueReminderOperation(performNativeDailyReminderCancellation);
    return;
  }

  logNativeReminder('cancel-deferred-for-lifecycle-check');
  window.setTimeout(() => {
    if (consumeNativeLogoutReminderPreservation()) {
      logNativeReminder('cancel-skipped-for-logout');
      return;
    }
    void enqueueReminderOperation(performNativeDailyReminderCancellation).catch((error) => {
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

async function ensureAndroidProductNotificationChannel(): Promise<void> {
  if (getCapacitorPlatform() !== 'android') return;
  const plugin = getCapacitorLocalNotificationsPlugin();
  await plugin?.createChannel?.({
    id: PRODUCT_NOTIFICATION_CHANNEL_ID,
    name: 'Innerbloom updates',
    description: 'Weekly, monthly, and achievement updates from Innerbloom.',
    importance: 4,
    visibility: 1,
    lights: true,
    vibration: true,
  });
}

export async function syncNativeProductNotifications(
  preferences: ProductNotificationPreferences,
  rewards: Pick<RewardsHistorySummary, 'growthCalibration' | 'habitAchievements'>,
  options?: { requestPermissions?: boolean },
): Promise<void> {
  if (!isNativeCapacitorPlatform()) return;

  await enqueueReminderOperation(async () => {
    const plugin = getCapacitorLocalNotificationsPlugin();
    if (!plugin) return;

    const enabled = preferences.weeklyWrappedEnabled
      || preferences.growthCalibrationEnabled
      || preferences.monthlyWrappedEnabled
      || preferences.habitAchievementEnabled;
    if (!enabled) {
      await plugin.cancel({ notifications: productNotificationIds() });
      logNativeReminder('product-notifications-cancelled');
      return;
    }

    const existingPermission = await plugin.checkPermissions();
    const shouldRequestPermission = options?.requestPermissions === true
      || existingPermission.display === 'prompt'
      || existingPermission.display === 'prompt-with-rationale';
    const permissions = shouldRequestPermission
      ? await ensureNativeDailyReminderNotificationPermissions({ requestExactAlarm: true })
      : { granted: existingPermission.display === 'granted' };

    if (!permissions.granted) {
      if (options?.requestPermissions && enabled) {
        throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
      }
      return;
    }

    await plugin.cancel({ notifications: productNotificationIds() });

    await ensureAndroidProductNotificationChannel();
    const schedule = buildProductNotificationSchedule(preferences, rewards);
    await scheduleNativeNotifications(schedule.map((item) => withNativeDeliveryOptions({
      id: item.id,
      title: item.title,
      body: item.body,
      badge: 1,
      channelId: PRODUCT_NOTIFICATION_CHANNEL_ID,
      smallIcon: 'ic_stat_innerbloom',
      iconColor: '#A855F7',
      schedule: { at: item.at, allowWhileIdle: true },
      extra: {
        targetPath: INNERBLOOM2_ACHIEVEMENTS_PATH,
        kind: item.kind,
      },
    })));
    logNativeReminder('product-notifications-scheduled', {
      enabled,
      scheduled: schedule.map((item) => ({ id: item.id, kind: item.kind, at: item.at.toISOString() })),
    });
  });
}

export async function clearNativeReminderDeliveryState(reason: string): Promise<void> {
  if (!isNativeCapacitorPlatform()) return;
  const plugin = getCapacitorLocalNotificationsPlugin();
  if (!plugin) return;

  const deliveredPlugin = plugin as typeof plugin & {
    removeAllDeliveredNotifications?: () => Promise<void>;
  };

  await deliveredPlugin.removeAllDeliveredNotifications?.().catch((error) => {
    logNativeReminder('delivered-clear-failed', {
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  logNativeReminder('delivered-cleared', { reason });
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

  await enqueueReminderOperation(async () => {
    await ensureAndroidReminderChannel();
    await plugin.cancel({ notifications: [{ id: DAILY_REMINDER_TEST_NOTIFICATION_ID }] });
    await scheduleNativeNotifications([
      withNativeDeliveryOptions({
        id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
        title: tNotification('dailyQuest.mobile.testNotification.title'),
        body: tNotification('dailyQuest.mobile.testNotification.body'),
        badge: 1,
        channelId: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
        schedule: {
          at: new Date(Date.now() + 10_000),
          allowWhileIdle: true,
        },
        extra: {
          targetPath: DAILY_REMINDER_NOTIFICATION_TARGET_PATH,
          kind: 'daily-reminder-test',
        },
      }),
    ]);

    const pending = await plugin.getPending?.().catch(() => null);
    logNativeReminder('test-scheduled', {
      id: DAILY_REMINDER_TEST_NOTIFICATION_ID,
      sound: DEFAULT_NOTIFICATION_SOUND,
      badge: 1,
      interruptionLevel: getCapacitorPlatform() === 'ios' ? IOS_INTERRUPTION_LEVEL : null,
      vibration: getCapacitorPlatform() === 'android',
      pendingIds: pending?.notifications?.map((notification) => notification.id).filter(Boolean) ?? null,
      pendingNotification: describePendingReminder(pending?.notifications, DAILY_REMINDER_TEST_NOTIFICATION_ID),
    });
  });
}

export async function syncNativeDailyReminderNotification(
  reminder: DailyReminderSettingsResponse | null | undefined,
  options?: ReminderSyncOptions,
): Promise<void> {
  if (!isNativeCapacitorPlatform()) {
    logNativeReminder('sync-skip-not-native');
    return;
  }

  const source = options?.source ?? 'lifecycle';
  if (source === 'lifecycle' && isLifecycleSyncProtected()) {
    logNativeReminder('sync-lifecycle-skipped-after-user-save', {
      protectionMs: USER_SAVE_LIFECYCLE_PROTECTION_MS,
      userSaveInProgress: isUserSaveSyncInProgress,
      elapsedSinceUserSaveMs: Date.now() - lastUserSaveSyncStartedAt,
    });
    return;
  }

  if (source === 'user-save') {
    isUserSaveSyncInProgress = true;
    lastUserSaveSyncStartedAt = Date.now();
  }

  try {
    await enqueueReminderOperation(async () => {
      const plugin = getCapacitorLocalNotificationsPlugin();
      if (!plugin) {
        logNativeReminder('sync-plugin-missing');
        return;
      }

      isReminderSyncInProgress = true;
      try {
        if (!isReminderEnabled(reminder)) {
          logNativeReminder('sync-reminder-disabled', {
            source,
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
            source,
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
          source,
          ids: dailyReminderNotificationIds().map(({ id }) => id),
          hour,
          minute,
          second,
          platform: getCapacitorPlatform(),
          sound: DEFAULT_NOTIFICATION_SOUND,
          badge: 1,
          interruptionLevel: getCapacitorPlatform() === 'ios' ? IOS_INTERRUPTION_LEVEL : null,
          vibration: getCapacitorPlatform() === 'android',
        });

        await plugin.cancel({ notifications: dailyReminderNotificationIds() });
        logNativeReminder('sync-previous-cancelled', {
          source,
          ids: dailyReminderNotificationIds().map(({ id }) => id),
        });

        const schedule = buildDailyReminderSchedule(
          reminder?.local_time ?? reminder?.localTime ?? '09:00:00',
        );

        await scheduleNativeNotifications(
          schedule.map(({ id, at }) => withNativeDeliveryOptions({
            id,
            title: tNotification('dailyQuest.mobile.notification.title'),
            body: tNotification('dailyQuest.mobile.notification.body'),
            badge: 1,
            channelId: DAILY_REMINDER_NOTIFICATION_CHANNEL_ID,
            smallIcon: 'ic_stat_innerbloom',
            iconColor: '#A855F7',
            schedule: {
              at,
              allowWhileIdle: true,
            },
            extra: {
              targetPath: DAILY_REMINDER_NOTIFICATION_TARGET_PATH,
              kind: 'daily-reminder',
            },
          })),
        );

        const pending = await plugin.getPending?.().catch((error) => {
          logNativeReminder('sync-pending-check-failed', {
            source,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        });
        const pendingIds = pending?.notifications?.map((notification) => notification.id).filter(Boolean) ?? null;
        const confirmed = pendingIds?.includes(DAILY_REMINDER_NOTIFICATION_ID) ?? false;
        const pendingNotification = describePendingReminder(
          pending?.notifications,
          DAILY_REMINDER_NOTIFICATION_ID,
        );
        logNativeReminder('sync-scheduled', {
          source,
          id: DAILY_REMINDER_NOTIFICATION_ID,
          hour,
          minute,
          second,
          sound: DEFAULT_NOTIFICATION_SOUND,
          badge: 1,
          interruptionLevel: getCapacitorPlatform() === 'ios' ? IOS_INTERRUPTION_LEVEL : null,
          pendingIds,
          pendingNotification,
          confirmed,
          scheduledCount: schedule.length,
          firstScheduledAt: schedule[0]?.at.toISOString() ?? null,
        });
        if (pending && !confirmed) {
          throw new Error(tNotification('dailyQuest.mobile.permissionRequired'));
        }
      } finally {
        isReminderSyncInProgress = false;
      }
    });
  } finally {
    if (source === 'user-save') {
      isUserSaveSyncInProgress = false;
    }
  }
}
