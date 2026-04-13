import type { PoolClient } from 'pg';
import { HttpError } from '../lib/http-error.js';

type QueryClient = Pick<PoolClient, 'query'>;

type AvatarRow = {
  avatar_id: number;
};

type UpdatedUserAvatarRow = {
  user_id: string;
  avatar_id: number;
  game_mode_id: number | null;
  image_url: string | null;
  avatar_url: string | null;
};

type UserRow = {
  user_id: string;
};

export async function resolveAvatarById(client: QueryClient, avatarId: number): Promise<AvatarRow> {
  const result = await client.query<AvatarRow>(
    `SELECT avatar_id
       FROM cat_avatar
      WHERE avatar_id = $1
        AND is_active = true
      LIMIT 1`,
    [avatarId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new HttpError(409, 'invalid_avatar', 'Invalid avatar');
  }

  return row;
}

export async function updateUserAvatar(client: QueryClient, input: {
  userId: string;
  avatarId: number;
}): Promise<UpdatedUserAvatarRow> {
  const updateResult = await client.query<UpdatedUserAvatarRow>(
    `UPDATE users
        SET avatar_id = $2
      WHERE user_id = $1::uuid
    RETURNING user_id, avatar_id, game_mode_id, image_url, avatar_url`,
    [input.userId, input.avatarId],
  );

  const updatedRow = updateResult.rows[0];
  if (updatedRow) {
    return updatedRow;
  }

  const userResult = await client.query<UserRow>(
    `SELECT user_id
       FROM users
      WHERE user_id = $1::uuid
      LIMIT 1`,
    [input.userId],
  );

  if (!userResult.rows[0]) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  throw new HttpError(500, 'avatar_update_failed', 'Failed to update avatar');
}
