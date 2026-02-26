import type { Pool, PoolClient } from 'pg';
import { pool } from '../db.js';

const TABLE_NAME = 'user_journey_ready_modal_views';

async function ensureTable(client: Pool | PoolClient = pool): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      user_journey_ready_modal_view_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      generation_key text NOT NULL,
      seen_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, generation_key)
    )
  `);
}

export async function getJourneyReadyModalSeenAt(
  userId: string,
  generationKey: string,
  client: Pool | PoolClient = pool,
): Promise<string | null> {
  const normalizedKey = generationKey.trim();
  if (!normalizedKey) {
    return null;
  }

  await ensureTable(client);
  const result = await client.query<{ seen_at: string }>(
    `SELECT seen_at
       FROM ${TABLE_NAME}
      WHERE user_id = $1
        AND generation_key = $2
      LIMIT 1`,
    [userId, normalizedKey],
  );

  return result.rows[0]?.seen_at ?? null;
}

export async function markJourneyReadyModalSeen(
  userId: string,
  generationKey: string,
  client: Pool | PoolClient = pool,
): Promise<string> {
  const normalizedKey = generationKey.trim();
  await ensureTable(client);

  const result = await client.query<{ seen_at: string }>(
    `INSERT INTO ${TABLE_NAME} (user_id, generation_key, seen_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, generation_key)
     DO UPDATE SET seen_at = now(), updated_at = now()
     RETURNING seen_at`,
    [userId, normalizedKey],
  );

  return result.rows[0]?.seen_at ?? new Date().toISOString();
}
