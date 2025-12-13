import { pool } from '../db.js';

export type WeeklyWrappedRow = {
  weekly_wrapped_id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  payload: unknown;
  summary: unknown | null;
  created_at: Date;
  updated_at: Date;
};

let readyPromise: Promise<void> | null = null;

async function ensureWeeklyWrappedReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS weekly_wrapped (
          weekly_wrapped_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL,
          week_start date NOT NULL,
          week_end date NOT NULL,
          payload jsonb NOT NULL,
          summary jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          UNIQUE (user_id, week_end)
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS weekly_wrapped_user_week_idx
          ON weekly_wrapped (user_id, week_end DESC);
      `);
    })();
  }

  await readyPromise;
}

function mapRow(row: WeeklyWrappedRow) {
  return {
    id: row.weekly_wrapped_id,
    userId: row.user_id,
    weekStart: row.week_start,
    weekEnd: row.week_end,
    payload: row.payload,
    summary: row.summary ?? null,
    createdAt: row.created_at?.toISOString?.() ?? new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at?.toISOString?.() ?? new Date(row.updated_at).toISOString(),
  };
}

export async function findWeeklyWrappedByWeek(
  userId: string,
  weekEnd: string,
): Promise<ReturnType<typeof mapRow> | null> {
  await ensureWeeklyWrappedReady();

  const result = await pool.query<WeeklyWrappedRow>(
    `SELECT *
       FROM weekly_wrapped
      WHERE user_id = $1
        AND week_end = $2
      LIMIT 1`,
    [userId, weekEnd],
  );

  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function insertWeeklyWrapped(input: {
  userId: string;
  weekStart: string;
  weekEnd: string;
  payload: unknown;
  summary?: unknown | null;
}): Promise<ReturnType<typeof mapRow>> {
  await ensureWeeklyWrappedReady();

  const result = await pool.query<WeeklyWrappedRow>(
    `INSERT INTO weekly_wrapped (
       user_id,
       week_start,
       week_end,
       payload,
       summary
     ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     ON CONFLICT (user_id, week_end) DO UPDATE SET
       payload = EXCLUDED.payload,
       summary = EXCLUDED.summary,
       updated_at = now()
     RETURNING *`,
    [input.userId, input.weekStart, input.weekEnd, JSON.stringify(input.payload), input.summary ?? null],
  );

  return mapRow(result.rows[0]);
}

export async function listRecentWeeklyWrapped(
  userId: string,
  limit = 2,
): Promise<ReturnType<typeof mapRow>[]> {
  await ensureWeeklyWrappedReady();

  const result = await pool.query<WeeklyWrappedRow>(
    `SELECT *
       FROM weekly_wrapped
      WHERE user_id = $1
   ORDER BY week_end DESC
      LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map(mapRow);
}

export async function listActiveUsersWithLogs(
  from: string,
  to: string,
): Promise<string[]> {
  await ensureWeeklyWrappedReady();

  const result = await pool.query<{ user_id: string }>(
    `SELECT DISTINCT user_id
       FROM (
              SELECT user_id
                FROM daily_log
               WHERE date BETWEEN $1 AND $2
             UNION
              SELECT user_id
                FROM emotions_logs
               WHERE date BETWEEN $1 AND $2
            ) AS active_users
   ORDER BY user_id`,
    [from, to],
  );

  return result.rows.map((row) => row.user_id);
}
