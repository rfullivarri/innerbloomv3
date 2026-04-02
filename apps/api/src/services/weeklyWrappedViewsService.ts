import type { Pool, PoolClient } from 'pg';
import { pool } from '../db.js';

const TABLE_NAME = 'weekly_wrapped_views';
const VALID_CLOSED_WEEK_SQL = `
  ww.week_start + INTERVAL '6 days' = ww.week_end
  AND EXTRACT(ISODOW FROM ww.week_start) = 1
  AND EXTRACT(ISODOW FROM ww.week_end) = 7
  AND ww.week_end < date_trunc('week', timezone('UTC', now()))::date
`;

async function ensureTable(client: Pool | PoolClient = pool): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      weekly_wrapped_view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      weekly_wrapped_id uuid NOT NULL REFERENCES weekly_wrapped(weekly_wrapped_id) ON DELETE CASCADE,
      seen_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, weekly_wrapped_id)
    )
  `);
}

export async function markWeeklyWrappedSeen(
  userId: string,
  weeklyWrappedId: string,
  client: Pool | PoolClient = pool,
): Promise<string> {
  await ensureTable(client);

  const insertResult = await client.query<{ seen_at: string }>(
    `INSERT INTO ${TABLE_NAME} (user_id, weekly_wrapped_id, seen_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, weekly_wrapped_id)
     DO NOTHING
     RETURNING seen_at`,
    [userId, weeklyWrappedId],
  );

  const insertedSeenAt = insertResult.rows[0]?.seen_at;
  if (insertedSeenAt) {
    return insertedSeenAt;
  }

  const existing = await client.query<{ seen_at: string }>(
    `SELECT seen_at
       FROM ${TABLE_NAME}
      WHERE user_id = $1
        AND weekly_wrapped_id = $2
      LIMIT 1`,
    [userId, weeklyWrappedId],
  );

  return existing.rows[0]?.seen_at ?? new Date().toISOString();
}

export async function listSeenWeeklyWrappedIds(
  userId: string,
  weeklyWrappedIds: string[],
  client: Pool | PoolClient = pool,
): Promise<Set<string>> {
  if (!weeklyWrappedIds.length) {
    return new Set();
  }

  await ensureTable(client);
  const result = await client.query<{ weekly_wrapped_id: string }>(
    `SELECT weekly_wrapped_id
       FROM ${TABLE_NAME}
      WHERE user_id = $1
        AND weekly_wrapped_id = ANY($2::uuid[])`,
    [userId, weeklyWrappedIds],
  );

  return new Set(result.rows.map((row) => row.weekly_wrapped_id));
}

export async function findPendingWeeklyWrappedId(
  userId: string,
  client: Pool | PoolClient = pool,
): Promise<string | null> {
  await ensureTable(client);

  const result = await client.query<{ weekly_wrapped_id: string }>(
    `SELECT ww.weekly_wrapped_id
       FROM weekly_wrapped ww
       LEFT JOIN ${TABLE_NAME} views
         ON views.user_id = ww.user_id
        AND views.weekly_wrapped_id = ww.weekly_wrapped_id
      WHERE ww.user_id = $1
        AND ${VALID_CLOSED_WEEK_SQL}
        AND views.weekly_wrapped_id IS NULL
   ORDER BY ww.week_end DESC
      LIMIT 1`,
    [userId],
  );

  return result.rows[0]?.weekly_wrapped_id ?? null;
}

export async function countUnseenWeeklyWrapped(userId: string, client: Pool | PoolClient = pool): Promise<number> {
  await ensureTable(client);

  const result = await client.query<{ unseen_count: number | string }>(
    `SELECT COUNT(*)::int AS unseen_count
       FROM weekly_wrapped ww
       LEFT JOIN ${TABLE_NAME} views
         ON views.user_id = ww.user_id
        AND views.weekly_wrapped_id = ww.weekly_wrapped_id
      WHERE ww.user_id = $1
        AND ${VALID_CLOSED_WEEK_SQL}
        AND views.weekly_wrapped_id IS NULL`,
    [userId],
  );

  return Number(result.rows[0]?.unseen_count ?? 0);
}
