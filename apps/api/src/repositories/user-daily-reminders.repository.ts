import { pool } from '../db.js';

const TABLE_NAME = 'user_daily_reminders';

export type UserDailyReminderRow = {
  user_daily_reminder_id: string;
  user_id: string;
  channel: string;
  status: string;
  timezone: string;
  local_time: string;
  last_sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type PendingEmailReminderRow = UserDailyReminderRow & {
  email_primary: string | null;
  email: string | null;
  first_name: string | null;
  full_name: string | null;
  effective_timezone: string;
};

export type CreateUserDailyReminderInput = {
  userId: string;
  channel?: string;
  status?: string;
  timezone?: string;
  localTime: string;
};

export type UpdateUserDailyReminderInput = Partial<{
  channel: string;
  status: string;
  timezone: string;
  localTime: string;
  lastSentAt: Date | null;
}>;

function normalizeLocalTime(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?$/u);

  if (!match) {
    throw new Error('localTime must use HH:mm or HH:mm:ss format');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  const seconds = Number(match[3] ?? '0');

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error('localTime is outside the valid range');
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function mapRow(row: UserDailyReminderRow | undefined): UserDailyReminderRow | null {
  return row ?? null;
}

export async function createUserDailyReminder(
  input: CreateUserDailyReminderInput,
): Promise<UserDailyReminderRow> {
  const localTime = normalizeLocalTime(input.localTime);
  const result = await pool.query<UserDailyReminderRow>(
    `
      INSERT INTO ${TABLE_NAME} (user_id, channel, status, timezone, local_time)
      VALUES ($1, COALESCE($2, 'email'), COALESCE($3, 'active'), COALESCE($4, 'UTC'), $5::time)
      RETURNING *;
    `,
    [input.userId, input.channel ?? null, input.status ?? null, input.timezone ?? null, localTime],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to insert user daily reminder');
  }
  return row;
}

export async function findUserDailyReminderById(id: string): Promise<UserDailyReminderRow | null> {
  const result = await pool.query<UserDailyReminderRow>(
    `SELECT * FROM ${TABLE_NAME} WHERE user_daily_reminder_id = $1 LIMIT 1;`,
    [id],
  );
  return mapRow(result.rows[0]);
}

export async function findUserDailyRemindersByUser(userId: string): Promise<UserDailyReminderRow[]> {
  const result = await pool.query<UserDailyReminderRow>(
    `SELECT * FROM ${TABLE_NAME} WHERE user_id = $1 ORDER BY channel;`,
    [userId],
  );
  return result.rows;
}

export async function deleteUserDailyReminder(id: string): Promise<boolean> {
  const result = await pool.query<UserDailyReminderRow>(
    `DELETE FROM ${TABLE_NAME} WHERE user_daily_reminder_id = $1 RETURNING user_daily_reminder_id;`,
    [id],
  );
  return result.rowCount > 0;
}

export async function updateUserDailyReminder(
  id: string,
  patch: UpdateUserDailyReminderInput,
): Promise<UserDailyReminderRow | null> {
  const assignments: string[] = [];
  const values: unknown[] = [id];

  if (typeof patch.channel !== 'undefined') {
    assignments.push(`channel = $${assignments.length + 2}`);
    values.push(patch.channel);
  }

  if (typeof patch.status !== 'undefined') {
    assignments.push(`status = $${assignments.length + 2}`);
    values.push(patch.status);
  }

  if (typeof patch.timezone !== 'undefined') {
    assignments.push(`timezone = $${assignments.length + 2}`);
    values.push(patch.timezone);
  }

  if (typeof patch.localTime !== 'undefined') {
    assignments.push(`local_time = $${assignments.length + 2}`);
    values.push(normalizeLocalTime(patch.localTime));
  }

  if (typeof patch.lastSentAt !== 'undefined') {
    assignments.push(`last_sent_at = $${assignments.length + 2}`);
    values.push(patch.lastSentAt);
  }

  if (assignments.length === 0) {
    return findUserDailyReminderById(id);
  }

  assignments.push(`updated_at = $${assignments.length + 2}`);
  values.push(new Date());

  const result = await pool.query<UserDailyReminderRow>(
    `UPDATE ${TABLE_NAME} SET ${assignments.join(', ')} WHERE user_daily_reminder_id = $1 RETURNING *;`,
    values,
  );
  return mapRow(result.rows[0]);
}

export async function findPendingEmailReminders(now: Date): Promise<PendingEmailReminderRow[]> {
  const result = await pool.query<PendingEmailReminderRow>(
    `
      WITH reminder_context AS (
        SELECT
          r.*, u.email_primary, u.email, u.first_name, u.full_name,
          NULLIF(r.timezone, '') AS reminder_tz,
          NULLIF(u.timezone, '') AS user_tz
        FROM ${TABLE_NAME} r
        JOIN users u ON u.user_id = r.user_id
        WHERE r.channel = 'email' AND r.status = 'active'
      )
      SELECT
        rc.user_daily_reminder_id,
        rc.user_id,
        rc.channel,
        rc.status,
        COALESCE(rc.reminder_tz, rc.user_tz, 'UTC') AS timezone,
        rc.local_time,
        rc.last_sent_at,
        rc.created_at,
        rc.updated_at,
        rc.email_primary,
        rc.email,
        rc.first_name,
        rc.full_name,
        COALESCE(rc.reminder_tz, rc.user_tz, 'UTC') AS effective_timezone
      FROM reminder_context rc
      WHERE
        (rc.last_sent_at IS NULL OR timezone(COALESCE(rc.reminder_tz, rc.user_tz, 'UTC'), $1::timestamptz)::date
          > timezone(COALESCE(rc.reminder_tz, rc.user_tz, 'UTC'), rc.last_sent_at)::date)
        AND timezone(COALESCE(rc.reminder_tz, rc.user_tz, 'UTC'), $1::timestamptz)::time >= rc.local_time;
    `,
    [now],
  );

  return result.rows;
}

export async function markRemindersAsSent(reminderIds: string[], sentAt: Date): Promise<void> {
  if (reminderIds.length === 0) {
    return;
  }

  await pool.query(
    `
      UPDATE ${TABLE_NAME}
         SET last_sent_at = $2::timestamptz,
             updated_at = $2::timestamptz
       WHERE user_daily_reminder_id = ANY($1::uuid[]);
    `,
    [reminderIds, sentAt],
  );
}
