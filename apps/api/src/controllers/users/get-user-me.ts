import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';

export type CurrentUserRow = {
  id: string;
  clerk_user_id: string;
  email_primary: string | null;
  full_name: string | null;
  image_url: string | null;
  game_mode: string | null;
  weekly_target: number | null;
  timezone: string | null;
  locale: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export const getCurrentUser: AsyncHandler = async (req, res) => {
  const headerValue = req.header('x-user-id');
  const userId = typeof headerValue === 'string' ? headerValue.trim() : '';

  if (!userId) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const result = await pool.query<CurrentUserRow>(
    'SELECT * FROM users WHERE clerk_user_id = $1',
    [userId],
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  res.status(200).json(result.rows[0]);
};
