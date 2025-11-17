import { pool } from '../db.js';

export const VALIDATE_TIMEZONE_SQL = 'SELECT 1 FROM pg_timezone_names WHERE name = $1 LIMIT 1';

type TimezoneRow = {
  exists: number;
};

export async function isValidTimezone(timezone: string): Promise<boolean> {
  if (!timezone) {
    return false;
  }

  const result = await pool.query<TimezoneRow>(VALIDATE_TIMEZONE_SQL, [timezone]);
  const rowCount =
    typeof result.rowCount === 'number'
      ? result.rowCount
      : Array.isArray(result.rows)
        ? result.rows.length
        : 0;
  return rowCount > 0;
}
