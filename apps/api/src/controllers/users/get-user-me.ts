import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';

export const SELECT_USER_SQL = `SELECT u.user_id,
       u.clerk_user_id,
       u.email_primary,
       u.full_name,
       u.image_url,
       gm.code AS game_mode,
       gm.weekly_target AS weekly_target,
       u.timezone,
       NULL::text AS locale,
       u.created_at,
       u.updated_at,
       u.deleted_at
  FROM users u
  LEFT JOIN cat_game_mode gm
         ON gm.game_mode_id = u.game_mode_id
 WHERE u.user_id = $1
 LIMIT 1`;

export type CurrentUserRow = {
  user_id: string;
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

async function selectUser(userId: string): Promise<CurrentUserRow | null> {
  const result = await pool.query<CurrentUserRow>(SELECT_USER_SQL, [userId]);
  return result.rows[0] ?? null;
}

export const getCurrentUser: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const user = await selectUser(authUser.id);

  if (!user) {
    throw new HttpError(500, 'user_not_found', 'Failed to resolve current user profile');
  }

  const status = authUser.isNew ? 201 : 200;
  res.status(status).json({ user });
};
