import type { Request } from 'express';
import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { isValidTimezone } from '../../lib/timezones.js';
import {
  createUserDailyReminder,
  findUserDailyReminderByUserAndChannel,
  updateUserDailyReminder,
  type UserDailyReminderRow,
} from '../../repositories/user-daily-reminders.repository.js';

const DEFAULT_LOCAL_TIME = '09:00:00';
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_STATUS = 'paused';
const DELIVERY_STRATEGY = 'user_local_time';
const SUPPORTED_CHANNELS = new Set(['email']);
const SELECT_USER_TIMEZONE_SQL = 'SELECT timezone FROM users WHERE user_id = $1 LIMIT 1';
const SELECT_USER_SCHEDULER_STATE_SQL =
  'SELECT scheduler_enabled, status_scheduler FROM users WHERE user_id = $1 LIMIT 1';
const UPDATE_USER_FIRST_PROGRAMMED_SQL = `
  UPDATE users
     SET first_programmed = true,
         updated_at = now()
   WHERE user_id = $1
     AND (first_programmed IS DISTINCT FROM true);
`;

const LEGACY_TIMESTAMP_ANCHOR = { year: 2000, month: 1, day: 1 };
const UPDATE_LEGACY_SCHEDULER_SQL = `
  UPDATE users
     SET scheduler_enabled = $2,
         channel_scheduler = $3,
         hour_scheduler = make_timestamptz($4, $5, $6, $7, $8, $9, $10),
         status_scheduler = $11,
         updated_at = now()
   WHERE user_id = $1;
`;

const updateBodySchema = z.object({
  status: z.enum(['active', 'paused']),
  local_time: z.string().min(1),
  timezone: z.string().min(1),
});

type ReminderChannel = 'email';

type UpdateBody = z.infer<typeof updateBodySchema>;

type SerializedReminder = {
  user_daily_reminder_id: string | null;
  reminder_id: string | null;
  channel: ReminderChannel;
  status: string;
  enabled: boolean;
  timezone: string;
  timeZone: string;
  time_zone: string;
  local_time: string;
  localTime: string;
  last_sent_at: string | null;
  delivery_strategy: string;
};

type LegacySchedulerStateRow = {
  scheduler_enabled: boolean | null;
  status_scheduler: string | null;
};

export const getCurrentUserDailyReminderSettings: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const channel = resolveChannel(req.query);
  const reminder = await findUserDailyReminderByUserAndChannel(authUser.id, channel);
  const legacyState = await resolveLegacySchedulerState(authUser.id);
  const fallbackTimezone = sanitizeTimezone(reminder?.timezone) ?? (await resolveUserTimezone(authUser.id));

  return res.json(serializeReminder(reminder, channel, fallbackTimezone, legacyState));
};

export const updateCurrentUserDailyReminderSettings: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const channel = resolveChannel(req.query);
  const body = updateBodySchema.parse(req.body ?? {});
  const normalizedLocalTime = normalizeLocalTimeInput(body.local_time);
  const normalizedTimezone = body.timezone.trim();
  const timezoneExists = await isValidTimezone(normalizedTimezone);

  if (!timezoneExists) {
    throw new HttpError(400, 'invalid_timezone', 'Unknown timezone');
  }

  const reminder = await persistReminder(authUser.id, channel, body, {
    localTime: normalizedLocalTime,
    timezone: normalizedTimezone,
  });

  if (!reminder) {
    throw new HttpError(500, 'reminder_persist_failed', 'Failed to persist reminder settings');
  }

  const legacyState: LegacySchedulerStateRow = {
    scheduler_enabled: body.status === 'active',
    status_scheduler: toLegacyStatus(body.status),
  };

  return res.json(serializeReminder(reminder, channel, normalizedTimezone, legacyState));
};

async function persistReminder(
  userId: string,
  channel: ReminderChannel,
  body: UpdateBody,
  overrides: { localTime: string; timezone: string },
): Promise<UserDailyReminderRow | null> {
  const existing = await findUserDailyReminderByUserAndChannel(userId, channel);

  if (existing) {
    const updated = await updateUserDailyReminder(existing.user_daily_reminder_id, {
      status: body.status,
      timezone: overrides.timezone,
      localTime: overrides.localTime,
    });

    await syncLegacySchedulerColumns({
      userId,
      channel,
      localTime: overrides.localTime,
      timezone: overrides.timezone,
      status: body.status,
    });
    await ensureUserFirstProgrammed(userId);

    return updated;
  }

  const created = await createUserDailyReminder({
    userId,
    channel,
    status: body.status,
    timezone: overrides.timezone,
    localTime: overrides.localTime,
  });

  await syncLegacySchedulerColumns({
    userId,
    channel,
    localTime: overrides.localTime,
    timezone: overrides.timezone,
    status: body.status,
  });
  await ensureUserFirstProgrammed(userId);

  return created;
}

async function syncLegacySchedulerColumns(input: {
  userId: string;
  channel: ReminderChannel;
  localTime: string;
  timezone: string;
  status: UpdateBody['status'];
}): Promise<void> {
  const { hours, minutes, seconds } = extractTimeParts(input.localTime);

  await pool.query(UPDATE_LEGACY_SCHEDULER_SQL, [
    input.userId,
    input.status === 'active',
    input.channel,
    LEGACY_TIMESTAMP_ANCHOR.year,
    LEGACY_TIMESTAMP_ANCHOR.month,
    LEGACY_TIMESTAMP_ANCHOR.day,
    hours,
    minutes,
    seconds,
    input.timezone,
    toLegacyStatus(input.status),
  ]);
}

async function ensureUserFirstProgrammed(userId: string): Promise<void> {
  await pool.query(UPDATE_USER_FIRST_PROGRAMMED_SQL, [userId]);
}

function resolveChannel(query: Request['query']): ReminderChannel {
  const raw = extractFirstValue(query.channel);
  const normalized = typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().toLowerCase() : 'email';

  if (!SUPPORTED_CHANNELS.has(normalized)) {
    throw new HttpError(400, 'invalid_channel', 'Unsupported reminder channel');
  }

  return normalized as ReminderChannel;
}

function extractFirstValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const [first] = value;
    return typeof first === 'string' ? first : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

function normalizeLocalTimeInput(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/u);

  if (!match) {
    throw new HttpError(400, 'invalid_local_time', 'local_time must use HH:mm format');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const seconds = Number(match[3] ?? '0');

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new HttpError(400, 'invalid_local_time', 'local_time is outside the valid range');
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function sanitizeTimezone(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function resolveUserTimezone(userId: string): Promise<string> {
  const result = await pool.query<{ timezone: string | null }>(SELECT_USER_TIMEZONE_SQL, [userId]);
  return sanitizeTimezone(result.rows[0]?.timezone) ?? DEFAULT_TIMEZONE;
}

async function resolveLegacySchedulerState(userId: string): Promise<LegacySchedulerStateRow> {
  const result = await pool.query<LegacySchedulerStateRow>(SELECT_USER_SCHEDULER_STATE_SQL, [userId]);
  return result.rows[0] ?? { scheduler_enabled: null, status_scheduler: null };
}

function extractTimeParts(value: string): { hours: number; minutes: number; seconds: number } {
  const [rawHours = '0', rawMinutes = '0', rawSeconds = '0'] = value.split(':');
  return {
    hours: Number(rawHours),
    minutes: Number(rawMinutes),
    seconds: Number(rawSeconds),
  };
}

function toLegacyStatus(status: UpdateBody['status']): 'ACTIVE' | 'PAUSED' {
  return status === 'active' ? 'ACTIVE' : 'PAUSED';
}

function serializeReminder(
  reminder: UserDailyReminderRow | null,
  channel: ReminderChannel,
  fallbackTimezone: string,
  legacyState?: LegacySchedulerStateRow | null,
): SerializedReminder {
  const normalizedLegacyStatus = normalizeLegacyStatus(legacyState?.status_scheduler);
  const normalizedReminderStatus = normalizeReminderStatus(reminder?.status);
  const status = normalizedLegacyStatus ?? normalizedReminderStatus ?? DEFAULT_STATUS;
  const timezone = sanitizeTimezone(reminder?.timezone) ?? fallbackTimezone ?? DEFAULT_TIMEZONE;
  const localTime = reminder?.local_time ?? DEFAULT_LOCAL_TIME;
  const enabledFromLegacy = normalizeLegacyEnabled(legacyState?.scheduler_enabled);
  const enabled = enabledFromLegacy ?? (status === 'active');

  return {
    user_daily_reminder_id: reminder?.user_daily_reminder_id ?? null,
    reminder_id: reminder?.user_daily_reminder_id ?? null,
    channel,
    status,
    enabled,
    timezone,
    timeZone: timezone,
    time_zone: timezone,
    local_time: localTime,
    localTime,
    last_sent_at: toIsoString(reminder?.last_sent_at),
    delivery_strategy: DELIVERY_STRATEGY,
  };
}

function normalizeLegacyStatus(value?: string | null): 'active' | 'paused' | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (['active', 'running', 'on'].includes(normalized)) {
    return 'active';
  }

  if (['paused', 'post', 'off'].includes(normalized)) {
    return 'paused';
  }

  return null;
}

function normalizeReminderStatus(value?: string | null): 'active' | 'paused' | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'active') {
    return 'active';
  }
  if (normalized === 'paused') {
    return 'paused';
  }
  return null;
}

function normalizeLegacyEnabled(value?: boolean | null): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
