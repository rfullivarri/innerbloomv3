import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { parseWithValidation } from '../../lib/validation.js';
import { isValidTimezone } from '../../lib/timezones.js';
import { pool } from '../../db.js';
import {
  createUserDailyReminder,
  findUserDailyRemindersByUser,
  updateUserDailyReminder,
  type UserDailyReminderRow,
} from '../../repositories/user-daily-reminders.repository.js';

const DEFAULT_CHANNEL = 'email';
const DEFAULT_STATUS = 'active';
const DEFAULT_LOCAL_TIME = '09:00:00';
const FALLBACK_TIMEZONE = 'UTC';
const SELECT_USER_TIMEZONE_SQL = 'SELECT timezone FROM users WHERE user_id = $1 LIMIT 1';

type UserTimezoneRow = {
  timezone: string | null;
};

type ReminderShape = {
  user_daily_reminder_id: string | null;
  channel: string;
  status: string;
  timezone: string;
  local_time: string;
  last_sent_at: Date | string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

const reminderBodySchema = z.object({
  local_time: z
    .string({ required_error: 'local_time is required' })
    .trim()
    .min(1, { message: 'local_time is required' }),
  timezone: z
    .string({ required_error: 'timezone is required' })
    .trim()
    .min(1, { message: 'timezone is required' }),
  status: z.enum(['active', 'paused']).optional(),
});

function mapReminderResponse(reminder: ReminderShape) {
  return {
    user_daily_reminder_id: reminder.user_daily_reminder_id,
    channel: reminder.channel,
    status: reminder.status,
    timezone: reminder.timezone,
    local_time: reminder.local_time,
    last_sent_at: serializeDate(reminder.last_sent_at),
    created_at: serializeDate(reminder.created_at),
    updated_at: serializeDate(reminder.updated_at),
  };
}

function serializeDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function toReminderShape(row: UserDailyReminderRow): ReminderShape {
  return {
    user_daily_reminder_id: row.user_daily_reminder_id,
    channel: row.channel,
    status: row.status,
    timezone: row.timezone,
    local_time: row.local_time,
    last_sent_at: row.last_sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function resolveUserTimezone(userId: string): Promise<string | null> {
  const result = await pool.query<UserTimezoneRow>(SELECT_USER_TIMEZONE_SQL, [userId]);
  const timezone = result.rows[0]?.timezone?.trim();
  return timezone && timezone.length > 0 ? timezone : null;
}

function isLocalTimeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes('localtime');
}

function buildDefaultReminder(timezone: string): ReminderShape {
  return {
    user_daily_reminder_id: null,
    channel: DEFAULT_CHANNEL,
    status: DEFAULT_STATUS,
    timezone,
    local_time: DEFAULT_LOCAL_TIME,
    last_sent_at: null,
    created_at: null,
    updated_at: null,
  };
}

export const getCurrentUserDailyReminder: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const reminders = await findUserDailyRemindersByUser(authUser.id);
  const reminder = reminders.find((row) => row.channel === DEFAULT_CHANNEL);

  if (reminder) {
    return res.json({ user_id: authUser.id, reminder: mapReminderResponse(toReminderShape(reminder)) });
  }

  const fallbackTimezone = (await resolveUserTimezone(authUser.id)) ?? FALLBACK_TIMEZONE;
  return res.json({ user_id: authUser.id, reminder: mapReminderResponse(buildDefaultReminder(fallbackTimezone)) });
};

export const upsertCurrentUserDailyReminder: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const payload = parseWithValidation(reminderBodySchema, req.body, 'Invalid reminder payload');
  const localTime = payload.local_time;
  const timezone = payload.timezone;
  const status = payload.status;

  if (!timezone.includes('/')) {
    return res.status(400).json({ error: 'invalid_timezone' });
  }

  const timezoneExists = await isValidTimezone(timezone);
  if (!timezoneExists) {
    return res.status(400).json({ error: 'unknown_timezone' });
  }

  const reminders = await findUserDailyRemindersByUser(authUser.id);
  const reminder = reminders.find((row) => row.channel === DEFAULT_CHANNEL);

  try {
    if (!reminder) {
      const created = await createUserDailyReminder({
        userId: authUser.id,
        channel: DEFAULT_CHANNEL,
        status: status ?? DEFAULT_STATUS,
        timezone,
        localTime,
      });

      return res.status(201).json({
        user_id: authUser.id,
        reminder: mapReminderResponse(toReminderShape(created)),
      });
    }

    const patch: Parameters<typeof updateUserDailyReminder>[1] = {
      timezone,
      localTime,
    };

    if (typeof status !== 'undefined') {
      patch.status = status;
    }

    const updated = await updateUserDailyReminder(reminder.user_daily_reminder_id, patch);

    if (!updated) {
      throw new HttpError(404, 'reminder_not_found', 'Reminder configuration not found');
    }

    return res.json({ user_id: authUser.id, reminder: mapReminderResponse(toReminderShape(updated)) });
  } catch (error) {
    if (isLocalTimeError(error)) {
      return res.status(400).json({ error: 'invalid_local_time' });
    }

    throw error;
  }
};

export const __TESTING__ = {
  DEFAULT_LOCAL_TIME,
  SELECT_USER_TIMEZONE_SQL,
};
