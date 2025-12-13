import { pool } from '../db.js';

const TABLE_NAME = 'tasks_ready_notifications';
const SHOULD_BOOTSTRAP_TABLE = process.env.NODE_ENV !== 'test';

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
            tasks_ready_notification_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL,
            tasks_group_id uuid NOT NULL,
            sent_at timestamptz NOT NULL DEFAULT now(),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT ${TABLE_NAME}_user_id_fkey FOREIGN KEY (user_id)
              REFERENCES users(user_id)
              ON UPDATE CASCADE
              ON DELETE CASCADE
          );
        `,
      );
      await pool.query(
        `
          CREATE UNIQUE INDEX IF NOT EXISTS ${TABLE_NAME}_user_group_key
            ON ${TABLE_NAME} (user_id, tasks_group_id);
        `,
      );
      await pool.query(
        `
          CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_group_idx
            ON ${TABLE_NAME} (tasks_group_id);
        `,
      );
    })().catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
}

export async function hasTasksReadyNotification(userId: string, tasksGroupId: string): Promise<boolean> {
  await ensureTableExists();
  const result = await pool.query(
    `SELECT 1 FROM ${TABLE_NAME} WHERE user_id = $1 AND tasks_group_id = $2 LIMIT 1`,
    [userId, tasksGroupId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function claimTasksReadyNotification(
  userId: string,
  tasksGroupId: string,
): Promise<string | null> {
  await ensureTableExists();

  const result = await pool.query<{ tasks_ready_notification_id: string }>(
    `INSERT INTO ${TABLE_NAME} (user_id, tasks_group_id)
       VALUES ($1, $2)
    ON CONFLICT (user_id, tasks_group_id) DO NOTHING
    RETURNING tasks_ready_notification_id`,
    [userId, tasksGroupId],
  );

  return result.rows[0]?.tasks_ready_notification_id ?? null;
}

export async function releaseTasksReadyNotification(notificationId: string): Promise<void> {
  await ensureTableExists();
  await pool.query(`DELETE FROM ${TABLE_NAME} WHERE tasks_ready_notification_id = $1`, [notificationId]);
}
