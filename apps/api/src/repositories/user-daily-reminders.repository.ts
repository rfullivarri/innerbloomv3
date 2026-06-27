import { pool } from '../db.js';

const TABLE_NAME = 'user_daily_reminders';
const SHOULD_BOOTSTRAP_TABLE =
  process.env.NODE_ENV !== 'test' && process.env.USER_DAILY_REMINDERS_AUTO_BOOTSTRAP !== 'false';

let ensureTablePromise: Promise<void> | null = null;

async function ensureTableExists(): Promise<void> {
  if (!SHOULD_BOOTSTRAP_TABLE) {
    return;
  }

  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      await pool.query(
        `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            user_daily_reminder_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL,
            channel text NOT NULL DEFAULT 'email',
            status text NOT NULL DEFAULT 'active',
            timezone text NOT NULL DEFAULT 'UTC',
            local_time time without time zone NOT NULL,
            last_sent_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT user_daily_reminders_user_id_fkey FOREIGN KEY (user_id)
              REFERENCES users(user_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE
          );
        `,
      );
      await pool.query(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS user_daily_reminders_user_channel_key
            ON ${TABLE_NAME} (user_id, channel);
        `,
      );
      await pool.query(
        `
          CREATE INDEX IF NOT EXISTS user_daily_reminders_status_channel_idx
            ON ${TABLE_NAME} (status, channel);
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

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

export type PendingEmailReminderLookup = {
  reminders: PendingEmailReminderRow[];
  nextCheckAt: Date | null;
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
  await ensureTableExists();
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
  await ensureTableExists();
  const result = await pool.query<UserDailyReminderRow>(
    `SELECT * FROM ${TABLE_NAME} WHERE user_daily_reminder_id = $1 LIMIT 1;`,
    [id],
  );
  return mapRow(result.rows[0]);
}

export async function findUserDailyRemindersByUser(userId: string): Promise<UserDailyReminderRow[]> {
  await ensureTableExists();
  const result = await pool.query<UserDailyReminderRow>(
    `SELECT * FROM ${TABLE_NAME} WHERE user_id = $1 ORDER BY channel;`,
    [userId],
  );
  return result.rows;
}

export async function findUserDailyReminderByUserAndChannel(
  userId: string,
  channel: string,
): Promise<UserDailyReminderRow | null> {
  await ensureTableExists();
  const result = await pool.query<UserDailyReminderRow>(
    `SELECT * FROM ${TABLE_NAME} WHERE user_id = $1 AND channel = $2 LIMIT 1;`,
    [userId, channel],
  );
  return mapRow(result.rows[0]);
}

export async function deleteUserDailyReminder(id: string): Promise<boolean> {
  await ensureTableExists();
  const result = await pool.query<UserDailyReminderRow>(
    `DELETE FROM ${TABLE_NAME} WHERE user_daily_reminder_id = $1 RETURNING user_daily_reminder_id;`,
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateUserDailyReminder(
  id: string,
  patch: UpdateUserDailyReminderInput,
): Promise<UserDailyReminderRow | null> {
  await ensureTableExists();
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

export async function findPendingEmailReminderLookup(now: Date): Promise<PendingEmailReminderLookup> {
  await ensureTableExists();
  const result = await pool.query<{
    reminders: PendingEmailReminderRow[] | string | null;
    next_check_at: Date | string | null;
  }>(
    `
      WITH reminder_context AS (
        SELECT
          r.*, u.email_primary, u.email, u.first_name, u.full_name,
          NULLIF(r.timezone, '') AS reminder_tz,
          NULLIF(u.timezone, '') AS user_tz
        FROM ${TABLE_NAME} r
        JOIN users u ON u.user_id = r.user_id
        WHERE r.channel = 'email' AND r.status = 'active'
      ),
      evaluated AS (
        SELECT
          rc.*,
          COALESCE(rc.reminder_tz, rc.user_tz, 'UTC') AS effective_timezone,
          timezone(COALESCE(rc.reminder_tz, rc.user_tz, 'UTC'), $1::timestamptz) AS local_now,
          CASE
            WHEN rc.last_sent_at IS NULL THEN NULL
            ELSE timezone(COALESCE(rc.reminder_tz, rc.user_tz, 'UTC'), rc.last_sent_at)::date
          END AS last_sent_local_date
        FROM reminder_context rc
      ),
      scheduled AS (
        SELECT
          e.*,
          (
            (e.last_sent_at IS NULL OR e.local_now::date > e.last_sent_local_date)
            AND e.local_now::time >= e.local_time
          ) AS is_due,
          (
            CASE
              WHEN
                (e.last_sent_at IS NULL OR e.local_now::date > e.last_sent_local_date)
                AND e.local_now::time < e.local_time
                THEN (e.local_now::date + e.local_time)
              ELSE ((e.local_now::date + INTERVAL '1 day')::date + e.local_time)
            END
          ) AT TIME ZONE e.effective_timezone AS next_check_at
        FROM evaluated e
      )
      SELECT
        COALESCE(
          json_agg(
            json_build_object(
              'user_daily_reminder_id', s.user_daily_reminder_id,
              'user_id', s.user_id,
              'channel', s.channel,
              'status', s.status,
              'timezone', s.effective_timezone,
              'local_time', s.local_time,
              'last_sent_at', s.last_sent_at,
              'created_at', s.created_at,
              'updated_at', s.updated_at,
              'email_primary', s.email_primary,
              'email', s.email,
              'first_name', s.first_name,
              'full_name', s.full_name,
              'effective_timezone', s.effective_timezone
            )
          ) FILTER (WHERE s.is_due),
          '[]'::json
        ) AS reminders,
        MIN(s.next_check_at) AS next_check_at
      FROM scheduled s;
    `,
    [now],
  );

  const row = result.rows[0];
  const rawReminders = row?.reminders ?? [];
  const reminders =
    typeof rawReminders === 'string'
      ? JSON.parse(rawReminders) as PendingEmailReminderRow[]
      : rawReminders;
  const rawNextCheckAt = row?.next_check_at ?? null;

  return {
    reminders,
    nextCheckAt: rawNextCheckAt ? new Date(rawNextCheckAt) : null,
  };
}

export async function findPendingEmailReminders(now: Date): Promise<PendingEmailReminderRow[]> {
  const result = await findPendingEmailReminderLookup(now);
  return result.reminders;
}

export async function findReminderContextForUser(
  userId: string,
  channel: string,
): Promise<PendingEmailReminderRow | null> {
  await ensureTableExists();
  const result = await pool.query<PendingEmailReminderRow>(
    `
      SELECT
        r.user_daily_reminder_id,
        r.user_id,
        r.channel,
        r.status,
        r.timezone,
        r.local_time,
        r.last_sent_at,
        r.created_at,
        r.updated_at,
        u.email_primary,
        u.email,
        u.first_name,
        u.full_name,
        COALESCE(NULLIF(r.timezone, ''), NULLIF(u.timezone, ''), 'UTC') AS effective_timezone
      FROM ${TABLE_NAME} r
      JOIN users u ON u.user_id = r.user_id
      WHERE r.user_id = $1 AND r.channel = $2
      LIMIT 1;
    `,
    [userId, channel],
  );

  return result.rows[0] ?? null;
}

export async function markRemindersAsSent(reminderIds: string[], sentAt: Date): Promise<void> {
  if (reminderIds.length === 0) {
    return;
  }

  await ensureTableExists();
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
