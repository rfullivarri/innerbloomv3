import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';

const SELECT_USER_SQL = 'SELECT * FROM users WHERE clerk_user_id = $1 LIMIT 1';
const INSERT_USER_SQL =
  'INSERT INTO users (clerk_user_id, email_primary) VALUES ($1, $2) ON CONFLICT (clerk_user_id) DO NOTHING RETURNING *';

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

async function selectUser(clerkUserId: string): Promise<CurrentUserRow | null> {
  const result = await pool.query<CurrentUserRow>(SELECT_USER_SQL, [clerkUserId]);
  return result.rows[0] ?? null;
}

async function insertUser(clerkUserId: string, email: string | null): Promise<CurrentUserRow | null> {
  const result = await pool.query<CurrentUserRow>(INSERT_USER_SQL, [clerkUserId, email]);
  return result.rows[0] ?? null;
}

export const getCurrentUser: AsyncHandler = async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    throw new HttpError(401, 'unauthorized', 'Authentication required');
  }

  const clerkUserId = authUser.clerkId;

  const existingUser = await selectUser(clerkUserId);
  if (existingUser) {
    const status = authUser.isNew ? 201 : 200;
    res.status(status).json({ user: existingUser });
    return;
  }

  const createdUser = await insertUser(clerkUserId, authUser.email ?? null);
  if (createdUser) {
    res.status(201).json({ user: createdUser });
    return;
  }

  const fallbackUser = await selectUser(clerkUserId);
  if (fallbackUser) {
    res.status(200).json({ user: fallbackUser });
    return;
  }

  throw new HttpError(500, 'user_creation_failed', 'Failed to create user');
};
