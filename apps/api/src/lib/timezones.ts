import { pool } from '../db.js';

export const VALIDATE_TIMEZONE_SQL = 'SELECT 1 FROM pg_timezone_names WHERE name = $1 LIMIT 1';

export async function isValidTimezone(timezone: string): Promise<boolean> {
  const trimmed = timezone.trim();

  if (!trimmed) {
    return false;
  }

  const result = await pool.query(VALIDATE_TIMEZONE_SQL, [trimmed]);
  return result.rows.length > 0;
}
