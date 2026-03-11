import { pool } from '../db.js';
import type { MonthlyWrappedEntry, MonthlyWrappedPayload } from '../types/monthlyWrapped.js';

type MonthlyWrappedRow = {
  monthly_wrapped_id: string;
  user_id: string;
  period_key: string;
  payload: unknown;
  summary: unknown | null;
  created_at: Date;
  updated_at: Date;
};

let readyPromise: Promise<void> | null = null;

async function ensureMonthlyWrappedReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS monthly_wrapped (
          monthly_wrapped_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          period_key text NOT NULL,
          payload jsonb NOT NULL,
          summary jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (user_id, period_key)
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS monthly_wrapped_user_period_idx
          ON monthly_wrapped (user_id, period_key DESC);
      `);
    })();
  }

  await readyPromise;
}

function mapRow(row: MonthlyWrappedRow): MonthlyWrappedEntry {
  return {
    id: row.monthly_wrapped_id,
    userId: row.user_id,
    periodKey: row.period_key,
    payload: row.payload as MonthlyWrappedPayload,
    summary: (row.summary as MonthlyWrappedEntry['summary']) ?? null,
    createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date(row.updated_at).toISOString(),
  };
}

export async function insertMonthlyWrapped(input: {
  userId: string;
  periodKey: string;
  payload: MonthlyWrappedPayload;
  summary?: unknown | null;
}): Promise<MonthlyWrappedEntry> {
  await ensureMonthlyWrappedReady();

  const result = await pool.query<MonthlyWrappedRow>(
    `INSERT INTO monthly_wrapped (
      user_id,
      period_key,
      payload,
      summary
    ) VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)
    ON CONFLICT (user_id, period_key)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      summary = EXCLUDED.summary,
      updated_at = NOW()
    RETURNING *`,
    [input.userId, input.periodKey, JSON.stringify(input.payload), input.summary ?? null],
  );

  return mapRow(result.rows[0]);
}

export async function trimMonthlyWrappedHistory(userId: string, keep = 2): Promise<number> {
  await ensureMonthlyWrappedReady();

  const result = await pool.query<{ monthly_wrapped_id: string }>(
    `DELETE FROM monthly_wrapped mw
      WHERE mw.user_id = $1::uuid
        AND mw.monthly_wrapped_id IN (
          SELECT monthly_wrapped_id
            FROM monthly_wrapped
           WHERE user_id = $1::uuid
        ORDER BY period_key DESC, created_at DESC
           OFFSET $2
        )
    RETURNING mw.monthly_wrapped_id`,
    [userId, keep],
  );

  return result.rowCount ?? 0;
}

export async function listRecentMonthlyWrapped(userId: string, limit = 2): Promise<MonthlyWrappedEntry[]> {
  await ensureMonthlyWrappedReady();

  const result = await pool.query<MonthlyWrappedRow>(
    `SELECT *
       FROM monthly_wrapped
      WHERE user_id = $1::uuid
   ORDER BY period_key DESC, created_at DESC
      LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map(mapRow);
}
