import { pool } from '../../db.js';
import { HttpError } from '../../lib/http-error.js';

export async function ensureUserExists(userId: string): Promise<void> {
  const result = await pool.query<{ user_id: string }>(
    'SELECT user_id FROM users WHERE user_id = $1 LIMIT 1',
    [userId],
  );

  if (result.rowCount === 0) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }
}
